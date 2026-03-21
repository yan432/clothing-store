/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tlaagtvplzitmqwqbluq.supabase.co',
      },
    ],
  },
}

export default nextConfig