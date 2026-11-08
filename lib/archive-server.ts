import type { ProductionRecord } from './api';
import { isProduction } from './productions';
import { SITES_BACKEND } from './sites-proxy';

/** Server-only caller: seed the archive from live published records, never the research JSON. */
export async function publishedArchive(token: string | undefined, fetchBackend: typeof fetch = fetch): Promise<ProductionRecord[] | null> {
  if (!token) return null;
  try {
    const response = await fetchBackend(`${SITES_BACKEND}/api/productions`, {
      headers: { 'OAI-Sites-Authorization': `Bearer ${token}`, Accept: 'application/json' },
      cache: 'force-cache', next: { revalidate: 30 }, redirect: 'manual', signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null;
    const data = await response.json();
    if (!Array.isArray(data.records) || !data.records.every((record: ProductionRecord) =>
      record?.publicationStatus === 'published' && isProduction(record.production))) return null;
    // Cards need only these fields; full credits and source documents stay out of the first response.
    return data.records.map((record: ProductionRecord) => {
      const { id, title, titleEn, year, season, performances, poster, posterAlt } = record.production;
      return { ...record, production: { id, title, titleEn, year, season, performances, poster, posterAlt } };
    });
  } catch {
    // A temporary backend failure leaves the client's existing retry flow available.
    return null;
  }
}
