/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for the Docker production image (Dockerfile copies .next/standalone).
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
