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
  // KI-01 fix: los prompts (`src/lib/ai/prompts/*.md`) se importan como
  // strings vía `import x from './foo.md?raw'`. Esta regla le dice a
  // webpack que cualquier import con query `?raw` se resuelva como el
  // contenido crudo del archivo. Sirve tanto en `next dev` como en
  // `next build` (server + standalone) sin depender de `__dirname` ni
  // file tracing. Mismo patrón que ya soporta Vite nativamente, así que
  // Vitest no necesita config adicional.
  webpack: (config) => {
    config.module.rules.push({
      resourceQuery: /raw/,
      type: 'asset/source',
    });
    return config;
  },
};

export default nextConfig;
