/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin explicitly: a parent directory with its own package-lock.json
  // can otherwise confuse Turbopack's automatic workspace-root inference.
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  onDemandEntries: {
    // Dispose of compiled routes you're not actively viewing much sooner
    // than the 60s/5-page default, so the dev server doesn't accumulate
    // a module graph for every page you've ever visited in the session.
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
