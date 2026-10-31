import type { Production } from './productions';

type Day = { year: number; month: number; day: number };
const stamp = ({ year, month, day }: Day) => Date.UTC(year, month - 1, day);
const valid = (date: Day) => {
  const value = new Date(stamp(date));
  return value.getUTCFullYear() === date.year && value.getUTCMonth() + 1 === date.month && value.getUTCDate() === date.day;
};

/** Read dated performances, including compact ranges, without exposing show times. */
export function productionDateRange(play: Pick<Production, 'performances' | 'season'>, language: 'zh' | 'en'): string {
  const parse = (value: string): Day[] => {
    const text = value.split(/[（(]/)[0].replace(/\d{1,2}[:：]\d{2}/g, '');
    const first = text.match(/^\s*(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})(?:日|号)?/);
    if (!first) return [];
    let previous = { year: Number(first[1]), month: Number(first[2]), day: Number(first[3]) };
    if (!valid(previous)) return [];
    const dates = [previous];
    const remaining = text.slice(first[0].length);
    const next = /(?:至|到|[–—~～、,，;；])\s*(?:(\d{4})[-/年])?(?:(\d{1,2})[-/月])?(\d{1,2})(?:日|号)?(?!\d)/g;
    for (const match of remaining.matchAll(next)) {
      const date = { year: Number(match[1] || previous.year), month: Number(match[2] || previous.month), day: Number(match[3]) };
      if (valid(date) && stamp(date) >= stamp(previous)) { dates.push(date); previous = date; }
    }
    return dates;
  };
  let dates = (play.performances || []).flatMap(parse);
  if (!dates.length && play.season) dates = parse(play.season);
  if (!dates.length) return '';
  dates.sort((a, b) => stamp(a) - stamp(b));
  const first = dates[0], last = dates[dates.length - 1];
  if (language === 'en') {
    const formatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    return stamp(first) === stamp(last) ? formatter.format(stamp(first)) : formatter.formatRange(stamp(first), stamp(last));
  }
  const full = (date: Day) => `${date.year}年${date.month}月${date.day}日`;
  if (stamp(first) === stamp(last)) return full(first);
  const end = first.year !== last.year ? full(last) : first.month !== last.month ? `${last.month}月${last.day}日` : `${last.day}日`;
  return `${full(first)}—${end}`;
}
