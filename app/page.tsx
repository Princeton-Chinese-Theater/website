import Link from 'next/link';
import { productions } from '@/lib/catalog';
import ProductionPage from '@/components/production-page';

export default function Home() {
  const play = productions[0];
  if (!play) return <div className="error"><h1>新的故事，即将开场。</h1><Link href="/new-play/">填写第一部新剧 →</Link></div>;
  return <ProductionPage play={play} catalog={productions} />;
}
