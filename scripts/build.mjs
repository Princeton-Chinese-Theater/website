import { spawnSync } from 'node:child_process';

const vercel = process.env.VERCEL === '1' || process.argv.includes('--vercel');
const env = { ...process.env, PCT_DEPLOY_TARGET: vercel ? 'vercel' : 'sites' };
const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], { stdio: 'inherit', env });
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status || 1);
if (!vercel) {
  const worker = spawnSync(process.execPath, ['scripts/build-worker.mjs'], { stdio: 'inherit', env });
  if (worker.error) throw worker.error;
  process.exit(worker.status || (worker.signal ? 1 : 0));
}
