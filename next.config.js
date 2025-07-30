/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Skip type checking during build for deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during builds
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  webpack: (config, { isServer, webpack }) => {
    const path = require('path');
    
    // Fix module resolution for UI components
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/app': path.resolve(__dirname, './src/app'),
    };
    
    // Ensure TypeScript files are properly resolved
    if (!config.resolve.extensions) {
      config.resolve.extensions = [];
    }
    if (!config.resolve.extensions.includes('.ts')) {
      config.resolve.extensions.push('.ts');
    }
    if (!config.resolve.extensions.includes('.tsx')) {
      config.resolve.extensions.push('.tsx');
    }
    if (!config.resolve.extensions.includes('.js')) {
      config.resolve.extensions.push('.js');
    }
    if (!config.resolve.extensions.includes('.jsx')) {
      config.resolve.extensions.push('.jsx');
    }
    
    // Add fallback for node modules
    if (!config.resolve.fallback) {
      config.resolve.fallback = {};
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    
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