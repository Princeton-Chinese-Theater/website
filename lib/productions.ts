export type Credit = { role: string; name: string };
export type MediaLink = { url: string; label: string };
export type Photo = { url: string; caption: string; alt?: string };
export type Production = {
  id: string;
  title: string;
  isExample?: boolean;
  titleEn?: string;
  season?: string;
  year?: string;
  tagline?: string;
  status?: string;
  performances?: string[];
  venue?: string;
  address?: string;
  language?: string;
  duration?: string;
  ticketUrl?: string;
  poster?: string;
  posterAlt?: string;
  synopsis?: string;
  directorNote?: string;
  creative?: Credit[];
  cast?: Credit[];
  crew?: Credit[];
  playbillUrl?: string;
  playbillLabel?: string;
  photos?: Photo[];
  videos?: MediaLink[];
  thanks?: string;
  sources?: MediaLink[];
  updatedAt?: string;
};

export const DRAFT_KEY = 'pct-production-draft';

/** Root-relative asset paths work on both the home page and nested production routes. */
export function safeUrl(value?: string): string {
  if (!value?.trim()) return '';
  const url = value.trim();
  if (/^https?:\/\//i.test(url)) {
    try { return new URL(url).href; } catch { return ''; }
  }
  if (/^\/?[a-z0-9_.-]+(?:\/[a-z0-9_.% -]+)*$/i.test(url) && !url.split('/').includes('..')) {
    return url.startsWith('/') ? url : `/${url}`;
  }
  return '';
}

export function isProduction(value: unknown): value is Production {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  if (typeof p.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id) || p.id === 'draft') return false;
  if (typeof p.title !== 'string' || !p.title.trim()) return false;
  for (const key of ['titleEn','season','year','tagline','status','venue','address','language','duration','ticketUrl','poster','posterAlt','synopsis','directorNote','playbillUrl','playbillLabel','thanks','updatedAt']) {
    if (p[key] !== undefined && typeof p[key] !== 'string') return false;
  }
  if (p.isExample !== undefined && typeof p.isExample !== 'boolean') return false;
  if (p.performances !== undefined && (!Array.isArray(p.performances) || !p.performances.every(v => typeof v === 'string'))) return false;
  for (const [keys, fields] of [
    [['creative','cast','crew'], ['role','name']],
    [['photos'], ['url','caption']],
    [['videos','sources'], ['url','label']],
  ]) {
    for (const key of keys) {
      const items = p[key];
      if (items !== undefined && (!Array.isArray(items) || !items.every(item => item && typeof item === 'object' && fields.every(field => typeof item[field] === 'string') && (item.alt === undefined || typeof item.alt === 'string')))) return false;
    }
  }
  return true;
}
