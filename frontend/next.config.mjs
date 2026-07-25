/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

    if (backendUrl) {
      return [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
        {
          source: '/health',
          destination: `${backendUrl}/health`,
        },
      ]
    }

    // On Vercel when no explicit backend URL is provided, Vercel Serverless (api/index.py) handles /api/* in monorepo deploys
    if (process.env.VERCEL) {
      return []
    }

    // Local development fallback to localhost:8000
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        source: '/health',
        destination: 'http://localhost:8000/health',
      },
    ]
  },
}

export default nextConfig
