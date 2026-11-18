import SocietyHome from '@/components/society-home';
import { publishedArchive } from '@/lib/archive-server';
import { latestProduction } from '@/lib/productions';

export default async function Home() {
  const hosted = process.env.VERCEL === '1' || process.env.PCT_DEPLOY_TARGET === 'vercel';
  const records = hosted ? await publishedArchive(process.env.SITES_BACKEND_TOKEN) : null;
  const featured = records ? latestProduction(records.map(({ production }) => production)) : null;
  return <SocietyHome initialProduction={featured} />;
}
