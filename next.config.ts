import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
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
