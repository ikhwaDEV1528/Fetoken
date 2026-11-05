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


// https://token-production-f782.up.railway.app/
// https://cvputrabakhtipratama.netlify.app/
// https://token-phi-dun.vercel.app/


export default nextConfig;