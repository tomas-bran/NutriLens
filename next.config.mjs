/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for the Docker production image (Dockerfile copies .next/standalone).
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
  // `pdf-parse@2.x` ships dual CJS/ESM with `"type": "module"`; webpack's
  // server bundler hits an `Object.defineProperty called on non-object` in
  // dev/RSC mode trying to interop the two. Keeping it as a server-external
  // package means Next.js leaves it alone and `require()`s it at runtime
  // from node_modules, which is fine because it only runs in the Node
  // runtime of `/api/analyze` anyway.
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
