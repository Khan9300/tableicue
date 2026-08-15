/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Only check files in src
    tsconfigPath: './tsconfig.json',
  },
};

module.exports = nextConfig;
