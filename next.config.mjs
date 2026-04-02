import path from 'node:path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1', '10.103.229.236'],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  logging: {
    browserToTerminal: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
