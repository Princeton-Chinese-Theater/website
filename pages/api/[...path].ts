import type { NextApiRequest, NextApiResponse } from 'next';
import { publicBackend } from '../../lib/sites-proxy';

export const config = { api: { responseLimit: false, bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const headers = new Headers();
  for (const key of ['content-type', 'cookie', 'origin', 'sec-fetch-site']) {
    const value = req.headers[key];
    if (typeof value === 'string') headers.set(key, value);
  }
  const host = req.headers.host || 'vercel.internal';
  const protocol = /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https';
  const chunks: Buffer[] = []; let size = 0;
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    for await (const chunk of req) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > 4 * 1024 * 1024) { res.status(413).json({ error: '文件或请求不能超过 4 MB' }); return; }
      chunks.push(bytes);
    }
  }
  const request = new Request(new URL(req.url || '/', `${protocol}://${host}`), {
    method: req.method, headers,
    ...!['GET', 'HEAD'].includes(req.method || 'GET') ? { body: new Uint8Array(Buffer.concat(chunks)) } : {},
  });
  const response = await publicBackend(request, process.env.SITES_BACKEND_TOKEN);
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
}
