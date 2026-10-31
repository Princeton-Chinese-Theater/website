import type { NextApiRequest, NextApiResponse } from 'next';
import { publicBackend } from '../../lib/sites-proxy';

export const config = { api: { responseLimit: false, bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const request = new Request(new URL(req.url || '/', 'https://vercel.internal'), { method: req.method });
  const response = await publicBackend(request, process.env.SITES_BACKEND_TOKEN);
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
}
