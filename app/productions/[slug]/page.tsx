import { notFound } from 'next/navigation';
import { findProduction, productions } from '@/lib/catalog';
import ProductionPage from '@/components/production-page';

export const dynamicParams = false;
export function generateStaticParams() {
  return productions.map(play => ({ slug: play.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const play = findProduction((await params).slug);
  return { title: play?.title || '剧目未找到', description: play?.tagline || '普林斯顿中文剧社剧目档案' };
}
export default async function ProductionRoute({ params }: { params: Promise<{ slug: string }> }) {
  const play = findProduction((await params).slug);
  if (!play) notFound();
  return <ProductionPage play={play} catalog={productions} />;
}
