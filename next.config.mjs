/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Mengabaikan error ESLint saat proses build Netlify
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;