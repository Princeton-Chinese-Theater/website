import type { NextConfig } from 'next';

const vercel = process.env.VERCEL === '1' || process.env.PCT_DEPLOY_TARGET === 'vercel';
const nextConfig: NextConfig = {
  ...(!vercel ? { output: 'export' as const } : {}),
  trailingSlash: true,
  ...(vercel ? {
    async rewrites() {
      return [{ source: '/media/:key', destination: '/api/backend-media/:key' }];
    },
  } : {}),
  ...(process.env.PCT_LOCAL_API ? {
    async rewrites() {
      return [
        { source: '/api/:path*', destination: `${process.env.PCT_LOCAL_API}/api/:path*` },
        { source: '/media/:path*', destination: `${process.env.PCT_LOCAL_API}/media/:path*` },
      ];
    },
  } : {}),
};

export default nextConfig;
