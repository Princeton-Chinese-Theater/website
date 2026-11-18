// Imported only by the Vercel server route. Never expose the service token to clients.
export const SITES_BACKEND = 'https://pct-production-template.hackprinceto-1505.chatgpt.site';
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function publicBackend(request: Request, token: string | undefined, fetchBackend: typeof fetch = fetch): Promise<Response> {
  const url = new URL(request.url), path = url.pathname.replace(/\/$/, '');
  const writing = !['GET', 'HEAD'].includes(request.method);
  if (writing && ((request.headers.get('origin') && request.headers.get('origin') !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site')) {
    return json({ error: '不接受跨站写入' }, 403);
  }
  // Next can pass the original public path to a Pages API handler after rewriting.
  const media = /^\/(?:media|api\/backend-media)\/([a-f0-9-]+\.(?:jpg|png|webp|gif|pdf))$/.exec(path);
  const production = /^\/api\/productions(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(path);
  const openAuth = /^\/api\/auth\/(login|activate|invitation|logout)$/.test(path);
  const protectedAuth = path === '/api/auth/password' || /^\/api\/admins(?:\/(invite|revoke))?$/.test(path);
  const upload = path === '/api/media';
  if (!production && !media && !openAuth && !protectedAuth && !upload && path !== '/api/session') return json({ error: '接口不存在' }, 404);
  if (media && writing) return json({ error: '不支持的请求方法' }, 405);
  const cookie = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).find(value => /^__Host-pct_admin=[a-f0-9]{64}$/.test(value));
  if ((protectedAuth || upload || (production && (writing || url.searchParams.has('scope')))) && !cookie) return json({ error: '请先登录管理后台' }, 401);
  if (url.searchParams.has('scope') && url.searchParams.get('scope') !== 'all') return json({ error: '无效的查询范围' }, 400);
  if (!token) return json({ error: '剧目资料服务尚未连接，请稍后重试' }, 503);
  try {
    // Only the opaque admin session is forwarded. Browser identity headers,
    // other cookies, Authorization and arbitrary destinations are never trusted.
    const headers = new Headers({ 'OAI-Sites-Authorization': `Bearer ${token}`, Accept: media ? '*/*' : 'application/json', 'X-PCT-Cookie-Transport': 'header' });
    if (cookie) headers.set('X-PCT-Session-Token', cookie.slice('__Host-pct_admin='.length));
    if (writing) {
      headers.set('Origin', SITES_BACKEND);
      headers.set('Content-Type', request.headers.get('content-type') || 'application/json');
    }
    const body = writing ? await request.arrayBuffer() : undefined;
    if (body && body.byteLength > 4 * 1024 * 1024) return json({ error: '文件或请求不能超过 4 MB' }, 413);
    const destination = SITES_BACKEND + (media ? `/media/${media[1]}` : path) + (production && url.searchParams.get('scope') === 'all' ? '?scope=all' : '');
    const response = await fetchBackend(destination, {
      method: request.method === 'HEAD' ? 'GET' : request.method, headers, body,
      cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15_000),
    });
    const contentType = response.headers.get('content-type') || '';
    if (media && response.ok) {
      if (!/^(image\/(jpeg|png|webp|gif)|application\/pdf)(;|$)/i.test(contentType)) throw new Error('Unexpected file response');
      return new Response(request.method === 'HEAD' ? null : response.body, { headers: {
        'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      } });
    }
    if (!contentType.includes('application/json')) throw new Error('Unexpected API response');
    const data = await response.json();
    if (response.ok && production && !cookie) {
      const records = path === '/api/productions' ? data.records : [data.record];
      if (!Array.isArray(records) || !records.every(record => record?.publicationStatus === 'published' && record.production)) throw new Error('Unexpected production response');
    }
    if (path === '/api/session' && response.ok) data.maxUploadBytes = 4 * 1024 * 1024;
    const output = json(data, response.status);
    const session = response.headers.get('x-pct-set-cookie') || response.headers.get('set-cookie');
    if (session && (openAuth || path === '/api/auth/password')) {
      if (!/^__Host-pct_admin=(?:[a-f0-9]{64})?; Path=\/; HttpOnly; SameSite=Strict; Max-Age=(?:0|28800); Secure$/.test(session)) throw new Error('Invalid session cookie');
      output.headers.set('Set-Cookie', session);
    }
    return request.method === 'HEAD' ? new Response(null, { status: output.status, headers: output.headers }) : output;
  } catch {
    return json({ error: '剧目资料服务暂时不可用，请稍后重试' }, 502);
  }
}
