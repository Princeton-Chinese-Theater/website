import type { Production } from './productions';
export type ProductionRecord = { production: Production; publicationStatus: 'draft' | 'published'; version: number; updatedAt: string };
export type Session = { authenticated: boolean; configured: boolean; canEdit: boolean };
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  const response = await fetch(path, { ...options, headers, cache: 'no-store', credentials: 'same-origin' });
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    throw new Error(response.redirected ? '登录状态已失效，请重新登录后再试' : '剧目资料接口暂时不可用，请稍后重试');
  }
  let data;
  try { data = await response.json(); } catch { throw new Error('剧目资料读取失败，请稍后重试'); }
  if (!response.ok) throw new Error(data.error || '请求失败，请稍后重试');
  return data as T;
}
