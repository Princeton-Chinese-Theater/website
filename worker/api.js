import { isProduction } from '../lib/productions.ts';

const MAX_BODY = 200_000;
const MAX_FILE = 10 * 1024 * 1024;
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
async function readBody(request) {
  const declared = Number(request.headers.get('content-length'));
  if (declared > MAX_BODY) fail(413, '剧目资料过大');
  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > MAX_BODY) fail(413, '剧目资料过大');
  try { return JSON.parse(new TextDecoder().decode(buffer)); } catch { fail(400, '请求数据不是有效 JSON'); }
}
const decodeRow = row => row && ({ production: JSON.parse(row.data), publicationStatus: row.publication_status, version: row.version, updatedAt: row.updated_at });
async function identity(request, env) {
  const userId = request.headers.get('oai-authenticated-user-id');
  const admin = await env.DB.prepare('SELECT user_id FROM site_admin WHERE id = 1').first();
  return { userId, configured: !!admin, canEdit: !!userId && admin?.user_id === userId };
}
async function requireAdmin(request, env) {
  const user = await identity(request, env);
  if (!user.userId) fail(401, '请先登录');
  if (!user.canEdit) fail(403, '当前账号没有管理权限');
  return user;
}
function validateRecord(body) {
  if (!isProduction(body?.production)) fail(400, '请检查剧目编号、名称和资料格式');
  if (!['draft','published'].includes(body.publicationStatus)) fail(400, '请选择草稿或发布状态');
}

export async function handleApi(request, env) {
  const url = new URL(request.url);
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) fail(403, '不接受跨站写入');
    }
    if (url.pathname.startsWith('/media/')) {
      if (!['GET','HEAD'].includes(request.method)) fail(405, '不支持的请求方法');
      const key = url.pathname.slice(7);
      if (!/^[a-f0-9-]+\.(jpg|png|webp|gif|pdf)$/.test(key)) fail(404, '文件不存在');
      const object = await env.BUCKET.get(key);
      if (!object) fail(404, '文件不存在');
      const headers = new Headers({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable' });
      object.writeHttpMetadata(headers); headers.set('ETag', object.httpEtag);
      return new Response(request.method === 'HEAD' ? null : object.body, { headers });
    }
    if (url.pathname === '/api/session' && request.method === 'GET') {
      const user = await identity(request, env);
      return json({ authenticated: !!user.userId, configured: user.configured, canEdit: user.canEdit });
    }
    if (url.pathname === '/api/setup' && request.method === 'POST') {
      const userId = request.headers.get('oai-authenticated-user-id');
      if (!userId) fail(401, '请先登录');
      // The first administrator is enrolled while the Site is owner-private.
      await env.DB.prepare('INSERT OR IGNORE INTO site_admin (id, user_id, created_at) VALUES (1, ?, ?)').bind(userId, new Date().toISOString()).run();
      const user = await identity(request, env);
      if (!user.canEdit) fail(403, '后台已有其他管理员');
      return json({ canEdit: true });
    }
    if (url.pathname === '/api/productions' && request.method === 'GET') {
      const all = url.searchParams.get('scope') === 'all';
      if (all) await requireAdmin(request, env);
      const result = await env.DB.prepare(all
        ? 'SELECT * FROM productions ORDER BY updated_at DESC, id ASC'
        : "SELECT * FROM productions WHERE publication_status = 'published' ORDER BY updated_at DESC, id ASC").all();
      return json({ records: result.results.map(decodeRow) });
    }
    if (url.pathname === '/api/productions' && request.method === 'POST') {
      await requireAdmin(request, env);
      const body = await readBody(request); validateRecord(body);
      const now = new Date().toISOString();
      const p = { ...body.production, updatedAt: now.slice(0,10) };
      const result = await env.DB.prepare('INSERT OR IGNORE INTO productions (id, title, data, publication_status, version, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)')
        .bind(p.id, p.title, JSON.stringify(p), body.publicationStatus, now, now).run();
      if (!result.meta.changes) fail(409, '剧目编号已存在，请换一个编号');
      return json({ record: decodeRow(await env.DB.prepare('SELECT * FROM productions WHERE id = ?').bind(p.id).first()) }, 201);
    }
    const match = /^\/api\/productions\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(url.pathname);
    if (match) {
      const id = match[1];
      if (request.method === 'GET') {
        const row = await env.DB.prepare('SELECT * FROM productions WHERE id = ?').bind(id).first();
        if (!row) fail(404, '没有找到这部剧');
        if (row.publication_status !== 'published') { const user = await identity(request, env); if (!user.canEdit) fail(404, '没有找到这部剧'); }
        return json({ record: decodeRow(row) });
      }
      if (request.method === 'PUT') {
        await requireAdmin(request, env);
        const body = await readBody(request); validateRecord(body);
        if (body.production.id !== id) fail(400, '已有剧目的编号不能修改');
        if (!Number.isSafeInteger(body.version) || body.version < 1) fail(400, '缺少有效版本号，请重新打开编辑页面');
        const now = new Date().toISOString(); const p = { ...body.production, updatedAt: now.slice(0,10) };
        const result = await env.DB.prepare('UPDATE productions SET title = ?, data = ?, publication_status = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?')
          .bind(p.title, JSON.stringify(p), body.publicationStatus, now, id, body.version).run();
        if (!result.meta.changes) fail(409, '资料已被更新，请重新加载最新版本再编辑。你的本机草稿仍然保留。');
        return json({ record: decodeRow(await env.DB.prepare('SELECT * FROM productions WHERE id = ?').bind(id).first()) });
      }
    }
    if (url.pathname === '/api/media' && request.method === 'POST') {
      await requireAdmin(request, env);
      if (Number(request.headers.get('content-length')) > MAX_FILE) fail(413, '文件不能超过 10 MB');
      const data = await request.arrayBuffer(); if (!data.byteLength || data.byteLength > MAX_FILE) fail(413, '请选择不超过 10 MB 的文件');
      const bytes = new Uint8Array(data); const head = new TextDecoder().decode(bytes.slice(0,12));
      let type, extension;
      if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) [type,extension] = ['image/jpeg','jpg'];
      else if ([137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b)) [type,extension] = ['image/png','png'];
      else if (head.startsWith('GIF87a') || head.startsWith('GIF89a')) [type,extension] = ['image/gif','gif'];
      else if (head.startsWith('RIFF') && head.slice(8,12) === 'WEBP') [type,extension] = ['image/webp','webp'];
      else if (head.startsWith('%PDF-')) [type,extension] = ['application/pdf','pdf'];
      else fail(415, '只支持 JPG、PNG、WebP、GIF 图片和 PDF 节目册');
      const key = `${crypto.randomUUID()}.${extension}`;
      await env.BUCKET.put(key, data, { httpMetadata: { contentType: type } });
      return json({ url: `/media/${key}`, contentType: type }, 201);
    }
    fail(404, '接口不存在');
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error('API request failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: '服务暂时不可用，请稍后重试' }, 500);
  }
}
