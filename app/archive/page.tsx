import ArchiveHome from '@/components/archive-home';
import { publishedArchive } from '@/lib/archive-server';
export const metadata = { title: '剧目档案' };
export default async function Archive(){
  // Sites exports a static shell; Vercel can regenerate the live archive in the background.
  const hosted = process.env.VERCEL === '1' || process.env.PCT_DEPLOY_TARGET === 'vercel';
  const records = hosted ? await publishedArchive(process.env.SITES_BACKEND_TOKEN) : null;
  return <ArchiveHome initialRecords={records} />;
}
