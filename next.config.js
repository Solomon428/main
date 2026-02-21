/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  eslint: {
    dirs: ['src'],
    // Temporarily ignore ESLint errors during build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['jose'],
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  // Configure webpack for better error handling
  webpack: (config, { isServer }) => {
    // Handle native modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
      // Polyfill DOMMatrix for canvas-related packages
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
