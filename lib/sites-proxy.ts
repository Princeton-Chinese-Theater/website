// Imported only by the Vercel server route. Never expose the access token to clients.
export const SITES_BACKEND = 'https://pct-production-template.hackprinceto-1505.chatgpt.site';
const json = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store' },
});

export async function publicBackend(request: Request, token: string | undefined, fetchBackend: typeof fetch = fetch): Promise<Response> {
  if (!['GET', 'HEAD'].includes(request.method)) return json({ error: '请在剧社后台管理内容' }, 405);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');
  if (path === '/api/session') return json({ authenticated: false, configured: true, canEdit: false });
  const media = /^\/api\/backend-media\/([a-f0-9-]+\.(?:jpg|png|webp|gif|pdf))$/.exec(path);
  const production = /^\/api\/productions(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(path);
  if (!production && !media) return json({ error: '接口不存在' }, 404);
  if (url.searchParams.has('scope')) return json({ error: '请在剧社后台查看草稿' }, 403);
  if (!token) return json({ error: '剧目资料服务尚未连接，请稍后重试' }, 503);
  try {
    // Rebuild the destination and headers: visitor identity, cookies, query strings
    // and authorization must never be forwarded to the private backend.
    const response = await fetchBackend(SITES_BACKEND + (media ? `/media/${media[1]}` : path), {
      method: request.method,
      headers: { 'OAI-Sites-Authorization': `Bearer ${token}`, Accept: media ? '*/*' : 'application/json' },
      cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 404) return json({ error: '没有找到这份资料' }, 404);
    if (!response.ok) return json({ error: '剧目资料暂时无法读取，请稍后重试' }, 502);
    const contentType = response.headers.get('content-type') || '';
    if (media) {
      if (!/^(image\/(jpeg|png|webp|gif)|application\/pdf)(;|$)/i.test(contentType)) throw new Error('Unexpected file response');
      return new Response(response.body, { headers: {
        'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      } });
    }
    if (!contentType.includes('application/json')) throw new Error('Unexpected API response');
    if (request.method === 'HEAD') return new Response(null, { headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store' } });
    const data = await response.json();
    const records = path === '/api/productions' ? data.records : [data.record];
    if (!Array.isArray(records) || !records.every(record => record?.publicationStatus === 'published' && record.production)) throw new Error('Unexpected production response');
    return json(data);
  } catch {
    return json({ error: '剧目资料暂时无法读取，请稍后重试' }, 502);
  }
}
