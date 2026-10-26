/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "jzmfbjdcqvgyeeafvzep.supabase.co",
      },
      {
        protocol: "https",
        hostname: "ecl-official.vercel.app",
      },
    ],
  },
};

module.exports = nextConfig;
