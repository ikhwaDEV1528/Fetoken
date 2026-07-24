/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source:'/api-be/:path*',
        destination: 'https://token-bi7ud97j9-ikhwan-mardityas-projects.vercel.app/:path*',
      },
    ];
  },
};

export default nextConfig;