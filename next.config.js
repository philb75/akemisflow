/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Only ignore build errors in production builds, not development
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    // Only ignore ESLint during production builds
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  webpack: (config, { isServer, webpack }) => {
    const path = require('path');
    
    // Fix module resolution for UI components
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/app': path.resolve(__dirname, 'src/app'),
    };
    
    // Ensure proper module resolution
    config.resolve.modules = [
      path.resolve(__dirname, 'src'),
      'node_modules',
      ...(config.resolve.modules || [])
    ];
    
    // Ensure TypeScript files are properly resolved
    config.resolve.extensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.json',
      ...(config.resolve.extensions || [])
    ];
    
    // Add fallback for node modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    return config;
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  images: {
    domains: ['localhost'],
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;