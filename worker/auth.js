// Password authentication is independent of Sites/ChatGPT visitor identities.
const SESSION_MS = 8 * 60 * 60 * 1000;
const INVITATION_MS = 24 * 60 * 60 * 1000;
const ROOT_EMAIL = 'luoxi813@outlook.com';
const encoder = new TextEncoder();
export class AuthError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const deny = (status, message) => { throw new AuthError(status, message); };
const authJson = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const hex = bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const tokenHash = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const same = (a, b) => { let mismatch = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return mismatch === 0; };
function emailAddress(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) deny(400, '请输入有效的邮箱地址');
  return email;
}
function validPassword(value) {
  if (typeof value !== 'string' || value.length < 15 || value.length > 128) deny(400, '密码需要 15–128 个字符');
  return value;
}
function pepper(env) {
  if (typeof env.AUTH_PASSWORD_PEPPER !== 'string' || env.AUTH_PASSWORD_PEPPER.length < 32) deny(503, '登录服务尚未准备好，请稍后重试');
  return env.AUTH_PASSWORD_PEPPER;
}
async function passwordDigest(password, salt, env) {
  // A server-held HMAC pepper protects password hashes independently of the DB.
  // Workers limits PBKDF2 to 100,000 iterations; use its native Web Crypto runtime.
  const hmac = await crypto.subtle.importKey('raw', encoder.encode(pepper(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prehash = await crypto.subtle.sign('HMAC', hmac, encoder.encode(password));
  const key = await crypto.subtle.importKey('raw', prehash, 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100_000 }, key, 256));
}
async function makePassword(password, env) {
  const salt = randomToken();
  return `${salt}:${await passwordDigest(validPassword(password), salt, env)}`;
}
async function checkPassword(password, stored, env) {
  const [salt, expected] = (stored || `${'0'.repeat(64)}:${'0'.repeat(64)}`).split(':');
  const actual = await passwordDigest(password, salt, env);
  return !!stored && same(actual, expected);
}
function cookieName(env) { return env.PCT_LOCAL_AUTH === true ? 'pct_admin_local' : '__Host-pct_admin'; }
function sessionToken(request, env) {
  const name = cookieName(env);
  const entry = (request.headers.get('cookie') || '').split(';').map(item => item.trim()).find(item => item.startsWith(name + '='));
  const value = entry?.slice(name.length + 1) || '';
  return /^[a-f0-9]{64}$/.test(value) ? value : '';
}
function sessionCookie(token, env, clear = false) {
  return `${cookieName(env)}=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_MS / 1000}${env.PCT_LOCAL_AUTH === true ? '' : '; Secure'}`;
}
export async function getAuthIdentity(request, env) {
  const token = sessionToken(request, env);
  if (!token) return { userId: null, email: null, canEdit: false };
  const row = await env.DB.prepare("SELECT a.email FROM admin_sessions s JOIN admin_accounts a ON a.email = s.email WHERE s.token_hash = ? AND s.expires_at > ? AND a.status = 'active' AND s.account_version = a.session_version")
    .bind(await tokenHash(token), Date.now()).first();
  return { userId: row?.email || null, email: row?.email || null, canEdit: !!row };
}
async function authAdmin(request, env) {
  const user = await getAuthIdentity(request, env);
  if (!user.canEdit) deny(401, '请先登录管理后台');
  return user;
}
async function authBody(request) {
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > 12_000) deny(413, '请求内容过大');
  let body;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { deny(400, '请求数据不是有效 JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) deny(400, '请求数据格式不正确');
  return body;
}
async function rateLimit(env, label, maximum) {
  const bucket = await tokenHash(label), now = Date.now(), windowStart = now - 15 * 60 * 1000;
  await env.DB.prepare('INSERT INTO auth_rate_limits (bucket, started_at, hits) VALUES (?, ?, 1) ON CONFLICT(bucket) DO UPDATE SET hits = CASE WHEN started_at < ? THEN 1 ELSE hits + 1 END, started_at = CASE WHEN started_at < ? THEN ? ELSE started_at END')
    .bind(bucket, now, windowStart, windowStart, now).run();
  const row = await env.DB.prepare('SELECT hits FROM auth_rate_limits WHERE bucket = ?').bind(bucket).first();
  if (row.hits > maximum) deny(429, '尝试次数过多，请在 15 分钟后再试');
}
async function createSession(email, env, expectedPasswordHash) {
  const token = randomToken(), now = Date.now();
  const result = await env.DB.prepare("INSERT INTO admin_sessions (token_hash, email, created_at, expires_at, account_version) SELECT ?, email, ?, ?, session_version FROM admin_accounts WHERE email = ? AND status = 'active' AND password_hash = ?")
    .bind(await tokenHash(token), now, now + SESSION_MS, email, expectedPasswordHash).run();
  if (!result.meta.changes) deny(401, '账号状态已变化，请重新登录');
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(now).run();
  return token;
}
async function invitationResult(email, env) {
  const token = randomToken(), now = Date.now();
  const result = await env.DB.prepare("UPDATE admin_accounts SET invitation_hash = ?, invitation_expires_at = ?, updated_at = ? WHERE email = ? AND status = 'invited'")
    .bind(await tokenHash(token), now + INVITATION_MS, new Date(now).toISOString(), email).run();
  if (!result.meta.changes) deny(409, '账号状态已变化，请刷新后再试');
  return { email, invitationToken: token, expiresAt: new Date(now + INVITATION_MS).toISOString() };
}

export async function handleAuthRequest(request, env) {
  const path = new URL(request.url).pathname, method = request.method;
  if (path === '/api/session' && method === 'GET') {
    const user = await getAuthIdentity(request, env);
    return authJson({ authenticated: user.canEdit, canEdit: user.canEdit, configured: true, email: user.email, maxUploadBytes: 10 * 1024 * 1024 });
  }
  if (path === '/api/setup') return authJson({ error: '请使用管理员邀请链接设置密码' }, 410);
  if (path === '/api/auth/bootstrap' && method === 'POST') {
    if (typeof env.ADMIN_BOOTSTRAP_TOKEN !== 'string' || env.ADMIN_BOOTSTRAP_TOKEN.length < 32) deny(404, '接口不存在');
    if (!same(await tokenHash(request.headers.get('x-bootstrap-token') || ''), await tokenHash(env.ADMIN_BOOTSTRAP_TOKEN))) deny(403, '没有初始化权限');
    const existing = await env.DB.prepare('SELECT email FROM admin_accounts LIMIT 1').first();
    if (existing) deny(409, '管理员已经初始化');
    const now = new Date().toISOString();
    const result = await env.DB.prepare("INSERT OR IGNORE INTO admin_accounts (email, status, invited_by, created_at, updated_at) VALUES (?, 'invited', 'initial-setup', ?, ?)")
      .bind(ROOT_EMAIL, now, now).run();
    if (!result.meta.changes) deny(409, '管理员已经初始化');
    return authJson(await invitationResult(ROOT_EMAIL, env), 201);
  }
  if (path === '/api/auth/login' && method === 'POST') {
    const body = await authBody(request), email = emailAddress(body.email);
    await rateLimit(env, 'login-email:' + email, 10);
    await rateLimit(env, 'login-network:' + (request.headers.get('cf-connecting-ip') || 'unknown'), 100);
    const password = typeof body.password === 'string' && body.password.length <= 128 ? body.password : '';
    const row = await env.DB.prepare('SELECT password_hash, status FROM admin_accounts WHERE email = ?').bind(email).first();
    const valid = await checkPassword(password, row?.password_hash, env);
    if (!valid || row.status !== 'active') deny(401, '邮箱或密码不正确');
    const token = await createSession(email, env, row.password_hash);
    await env.DB.prepare('DELETE FROM auth_rate_limits WHERE bucket = ?').bind(await tokenHash('login-email:' + email)).run();
    return authJson({ email }, 200, { 'Set-Cookie': sessionCookie(token, env) });
  }
  if (path === '/api/auth/invitation' && method === 'POST') {
    const body = await authBody(request);
    const token = typeof body.token === 'string' && /^[a-f0-9]{64}$/.test(body.token) ? body.token : '';
    const row = token && await env.DB.prepare("SELECT email, invitation_expires_at FROM admin_accounts WHERE invitation_hash = ? AND status = 'invited' AND invitation_expires_at > ?")
      .bind(await tokenHash(token), Date.now()).first();
    if (!row) deny(400, '邀请链接已失效或已使用，请联系管理员重新邀请');
    return authJson({ email: row.email, expiresAt: new Date(row.invitation_expires_at).toISOString() });
  }
  if (path === '/api/auth/activate' && method === 'POST') {
    const body = await authBody(request);
    const token = typeof body.token === 'string' && /^[a-f0-9]{64}$/.test(body.token) ? body.token : '';
    const hashedToken = await tokenHash(token), now = Date.now();
    const row = token && await env.DB.prepare("SELECT email FROM admin_accounts WHERE invitation_hash = ? AND status = 'invited' AND invitation_expires_at > ?").bind(hashedToken, now).first();
    if (!row) deny(400, '邀请链接已失效或已使用，请联系管理员重新邀请');
    const password = await makePassword(body.password, env);
    const result = await env.DB.prepare("UPDATE admin_accounts SET password_hash = ?, status = 'active', invitation_hash = NULL, invitation_expires_at = NULL, updated_at = ? WHERE email = ? AND invitation_hash = ? AND status = 'invited' AND invitation_expires_at > ?")
      .bind(password, new Date().toISOString(), row.email, hashedToken, Date.now()).run();
    if (!result.meta.changes) deny(400, '邀请链接已失效或已使用');
    const session = await createSession(row.email, env, password);
    return authJson({ email: row.email }, 200, { 'Set-Cookie': sessionCookie(session, env) });
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    const token = sessionToken(request, env);
    if (token) await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await tokenHash(token)).run();
    return authJson({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', env, true) });
  }
  if (path === '/api/auth/password' && method === 'POST') {
    const user = await authAdmin(request, env), body = await authBody(request);
    await rateLimit(env, 'password:' + user.email, 10);
    const row = await env.DB.prepare('SELECT password_hash FROM admin_accounts WHERE email = ?').bind(user.email).first();
    const oldPassword = typeof body.currentPassword === 'string' && body.currentPassword.length <= 128 ? body.currentPassword : '';
    if (!await checkPassword(oldPassword, row.password_hash, env)) deny(400, '当前密码不正确');
    const password = await makePassword(body.password, env);
    const changed = await env.DB.prepare("UPDATE admin_accounts SET password_hash = ?, session_version = session_version + 1, updated_at = ? WHERE email = ? AND status = 'active' AND password_hash = ?")
      .bind(password, new Date().toISOString(), user.email, row.password_hash).run();
    if (!changed.meta.changes) deny(409, '账号状态已变化，请重新登录');
    await env.DB.prepare('DELETE FROM admin_sessions WHERE email = ?').bind(user.email).run();
    const token = await createSession(user.email, env, password);
    return authJson({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token, env) });
  }
  if (path === '/api/admins' && method === 'GET') {
    await authAdmin(request, env);
    const result = await env.DB.prepare('SELECT email, status, invited_by AS invitedBy, created_at AS createdAt FROM admin_accounts ORDER BY created_at, email').all();
    return authJson({ admins: result.results });
  }
  if (path === '/api/admins/invite' && method === 'POST') {
    const user = await authAdmin(request, env), body = await authBody(request), email = emailAddress(body.email);
    await rateLimit(env, 'invite:' + user.email, 30);
    const existing = await env.DB.prepare('SELECT status FROM admin_accounts WHERE email = ?').bind(email).first();
    if (existing?.status === 'active') deny(409, '该邮箱已经是管理员');
    const now = new Date().toISOString();
    if (!existing) {
      await env.DB.prepare("INSERT OR IGNORE INTO admin_accounts (email, status, invited_by, created_at, updated_at) VALUES (?, 'invited', ?, ?, ?)").bind(email, user.email, now, now).run();
    } else if (existing.status === 'revoked') {
      await env.DB.prepare("UPDATE admin_accounts SET status = 'invited', password_hash = NULL, invited_by = ?, updated_at = ? WHERE email = ? AND status = 'revoked'").bind(user.email, now, email).run();
    }
    return authJson(await invitationResult(email, env), 201);
  }
  if (path === '/api/admins/revoke' && method === 'POST') {
    const user = await authAdmin(request, env), body = await authBody(request), email = emailAddress(body.email);
    if (email === user.email) deny(400, '不能撤销自己的管理员权限');
    const result = await env.DB.prepare("UPDATE admin_accounts SET status = 'revoked', session_version = session_version + 1, password_hash = NULL, invitation_hash = NULL, invitation_expires_at = NULL, updated_at = ? WHERE email = ? AND status <> 'revoked' AND EXISTS (SELECT 1 FROM admin_accounts actor WHERE actor.email = ? AND actor.status = 'active') AND (status <> 'active' OR (SELECT COUNT(*) FROM admin_accounts WHERE status = 'active') > 1)")
      .bind(new Date().toISOString(), email, user.email).run();
    if (!result.meta.changes) deny(409, '账号状态已变化，请刷新管理员名单');
    await env.DB.prepare('DELETE FROM admin_sessions WHERE email = ?').bind(email).run();
    return authJson({ ok: true });
  }
  return null;
}
