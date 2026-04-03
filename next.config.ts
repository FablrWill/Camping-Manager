import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Mark native/Node-only packages as server-side externals so webpack skips bundling them.
  // better-sqlite3 and sqlite-vec use native bindings; voyageai and pdf-parse have ESM packaging issues in webpack.
  serverExternalPackages: ['better-sqlite3', 'sqlite-vec', 'voyageai', 'pdf-parse', 'cheerio'],
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },
};

export default nextConfig;
