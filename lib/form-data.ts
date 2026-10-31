import { isProduction, type Production } from './productions';

function lines(value: string) { return value.split('\n').map(line => line.trim()).filter(Boolean); }
function pairs(value: string, first: string, second: string) {
  return lines(value).map(line => {
    const index = line.indexOf('|');
    return index < 0 ? { [first]: line, [second]: '' } : { [first]: line.slice(0,index).trim(), [second]: line.slice(index+1).trim() };
  });
}
export function productionFromForm(form: FormData): Production {
  const raw = Object.fromEntries(form) as Record<string, string>;
  const play: Record<string, unknown> = { ...raw, isExample: false };
  play.id = raw.id?.trim();
  play.title = raw.title?.trim();
  play.performances = lines(raw.performances || '');
  for (const key of ['creative','cast','crew']) play[key] = pairs(raw[key] || '', 'role', 'name');
  play.photos = pairs(raw.photos || '', 'url', 'caption');
  for (const key of ['videos','sources']) play[key] = pairs(raw[key] || '', 'url', 'label');
  if (!isProduction(play)) throw new Error('请填写有效的剧目编号和中文剧名，并检查资料格式。');
  return play;
}
export function formValue(play: Production, key: string): string {
  const value = play[key as keyof Production];
  if (Array.isArray(value)) return value.map(item => {
    if (typeof item === 'string') return item;
    if ('role' in item) return `${item.role} | ${item.name}`;
    return `${item.url} | ${'caption' in item ? item.caption : item.label}`;
  }).join('\n');
  return typeof value === 'string' ? value : '';
}
