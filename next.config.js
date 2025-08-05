/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dynamic rendering for Netlify with API routes support
  // Note: No 'output: export' - we need dynamic rendering for API routes
  
  // Image configuration for dynamic Next.js app
  images: {
    domains: [],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? true : false,
  },
  reactStrictMode: true,
  serverExternalPackages: ['firebase-admin'],
  
  // Exclude Firebase functions directory from Next.js build
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  
  outputFileTracingExcludes: {
    '*': ['./functions/**/*'],
  },
  
  webpack: (config, { isServer }) => {
    // Client-side polyfills and fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        // Additional fallbacks for Firebase Admin SDK
        dns: false,
        http2: false,
        module: false,
      }
    }

    // Optimize client-side bundles
    if (!isServer) {
      config.optimization.splitChunks.chunks = 'all';
      
      // Exclude server-only packages from client bundle
      config.externals = config.externals || [];
      config.externals.push('firebase-admin');
    }

    // Server-side optimizations
    if (isServer) {
      // Mark firebase-admin as external to prevent bundling issues
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('firebase-admin');
      }
    }

    // Production optimizations
    if (process.env.NODE_ENV === 'production') {
      config.devtool = false;
      
      // Additional production optimizations
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
    }

    return config;
  },
  
  eslint: {
    // Allow build to continue with ESLint warnings in production
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  typescript: {
    // Allow build to continue with TypeScript errors in production if needed
    ignoreBuildErrors: process.env.NETLIFY === 'true',
  },
  
  productionBrowserSourceMaps: false,
  
  async headers() {
    return [
      {
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
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://firestore.googleapis.com https://generativelanguage.googleapis.com https://api.deepseek.com; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },
  
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/config',
        destination: '/login',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
