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

/** Display a production term without exposing exact dates or research notes. */
export function productionTerm(play: Pick<Production, 'year' | 'season' | 'performances'>): string {
  const year = play.year?.trim();
  if (!year) return '时间待考';
  const season = play.season || '';
  if (/\b(spring)\b|春/i.test(season)) return `${year} Spring`;
  if (/\b(fall|autumn)\b|秋/i.test(season)) return `${year} Fall`;
  // Only use a leading performance date, never a later publication or research date.
  const date = [season, ...(play.performances || [])].map(value => value.match(/^\s*\d{4}\s*(?:年|[-/])\s*(\d{1,2})(?:月|[-/])/)).find(Boolean);
  if (date) {
    const month = Number(date[1]);
    if (month >= 1 && month <= 6) return `${year} Spring`;
    if (month >= 8 && month <= 12) return `${year} Fall`;
  }
  return year;
}

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

/** Show official production pages; personal profiles and research leads stay internal. */
export function publicProductionSources(sources: MediaLink[] = []): MediaLink[] {
  return sources.flatMap(source => {
    const value = safeUrl(source.url);
    if (!value || value.startsWith('/') || /google\s*drive|共享盘|shared[ -]drive/i.test(source.label)) return [];
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    // Raw images, documents and programme files are assets, not production articles.
    if (/\.(?:pdf|docx?|xlsx?|png|jpe?g|webp|gif)$/i.test(url.pathname)) return [];
    let label = '';
    if (host === 'mp.weixin.qq.com' && /^\/s(?:\/|$)/.test(url.pathname)) {
      const account = url.searchParams.get('__biz');
      if (account && account !== 'MjM5MDE2MDI4OQ==') return [];
      label = '剧社公众号原文';
    } else if (['www.princeton.edu','princeton.edu'].includes(host) && url.pathname.startsWith('/~ctheatre/')) {
      label = '剧社旧官网';
    } else if (host === 'arts.princeton.edu' && /^\/(?:news|events|events?\/)/.test(url.pathname)) {
      label = '普林斯顿大学艺术中心公告';
    } else if (['puc.tickets.princeton.edu','tickets.princeton.edu'].includes(host) && /^\/event(?:\/|$)/.test(url.pathname)) {
      label = '普林斯顿大学演出公告';
    }
    return label ? [{url: value, label: source.label && !['原始资料','旧版官网资料'].includes(source.label) ? source.label : label}] : [];
  });
}

export function archiveDisplayText(value: string | undefined, language: 'zh' | 'en'): string | undefined {
  return value?.replace(/google\s*drive|谷歌云端硬盘|Google云端硬盘|共享盘|shared[ -]drive/gi, language === 'en' ? 'PCT archives' : '剧社档案');
}
