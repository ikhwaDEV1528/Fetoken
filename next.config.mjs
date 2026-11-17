/** @type {import('next').NextConfig} */


const nextConfig = {
  async rewrites() {
    return [ 
      {
        source: '/api-be/:path*',
        destination: `${process.env.API_BE}:path*`, // sesuaikan port
      },
    ];
  },
};




export default nextConfig;