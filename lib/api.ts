import type { Production } from './productions';
export type ProductionRecord = { production: Production; publicationStatus: 'draft' | 'published'; version: number; updatedAt: string };
export type Session = { authenticated: boolean; configured: boolean; canEdit: boolean };
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, cache: 'no-store', credentials: 'same-origin' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '请求失败，请稍后重试');
  return data as T;
}
