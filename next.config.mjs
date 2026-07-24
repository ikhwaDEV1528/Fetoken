/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source:'/api-be/:path*',
        destination: 'https://token-phi-dun.vercel.app/:path*',
      },
    ];
  },
};

export default nextConfig;