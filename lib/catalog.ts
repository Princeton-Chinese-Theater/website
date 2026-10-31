import data from '@/public/data/productions.json';
import { isProduction, type Production } from './productions';

if (!data.productions.every(isProduction)) throw new Error('剧目资料格式不正确，请检查 public/data/productions.json');
if (new Set(data.productions.map(play => play.id)).size !== data.productions.length) throw new Error('剧目编号不能重复');

export const productions: Production[] = data.productions;
export function findProduction(slug: string) {
  return productions.find(play => play.id === slug);
}
