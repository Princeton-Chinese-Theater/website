import type { Metadata } from 'next';
import DraftPreview from '@/components/draft-preview';

export const metadata: Metadata = { title: '新剧草稿预览', robots: { index: false, follow: false } };
export default function Preview() { return <DraftPreview />; }
