/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/games/sky-surfing/outro',
        destination: '/games/sky-surfing/ending',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
