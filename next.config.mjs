/** @type {import('next').NextConfig} */


// const nextConfig = {
//   async rewrites() {
//     return [
//       {
//         source:'/api-be/:path*',
//         destination: 'https://token-production-f782.up.railway.app/:path*',
//       },
//     ];
//   },
// };


// export default nextConfig;


// next.config.mjs
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://domain-railway-kamu.up.railway.app/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },
};

export default nextConfig;