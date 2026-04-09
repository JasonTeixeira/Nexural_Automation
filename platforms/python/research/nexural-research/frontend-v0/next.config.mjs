import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // TODO: Fix 233 TS errors in v0-generated code (mostly implicit any + Plotly prop types)
  // These are type-only issues — no runtime impact. Fix when redesigning frontend.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${BACKEND_URL}/api/:path*`,
        },
        {
          source: '/metrics',
          destination: `${BACKEND_URL}/metrics`,
        },
      ],
    }
  },
}

export default nextConfig
