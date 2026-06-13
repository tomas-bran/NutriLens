import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Avatares de Google (login con Google, NL-201) — next/image bloquea hosts
  // remotos no declarados.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },
  // Pin the tracing root to this repo: stray lockfiles in parent dirs would
  // otherwise make Next.js infer the wrong workspace root (warns on every
  // build and can mis-trace files in the standalone output).
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // Standalone output is only needed by the Docker production image (the
  // Dockerfile copies `.next/standalone` and sets BUILD_STANDALONE=1). It's
  // gated because `next start` — used by the Playwright webServer and local
  // smoke runs — doesn't serve standalone output and warns on every run.
  ...(process.env.BUILD_STANDALONE === '1' ? { output: 'standalone' } : {}),
  // Stable since Next 15.5 (was `experimental.typedRoutes`).
  typedRoutes: true,
  // `pdf-parse@2.x` ships dual CJS/ESM with `"type": "module"`; webpack's
  // server bundler hits an `Object.defineProperty called on non-object` in
  // dev/RSC mode trying to interop the two. Keeping it as a server-external
  // package means Next.js leaves it alone and `require()`s it at runtime
  // from node_modules, which is fine because it only runs in the Node
  // runtime of `/api/analyze` anyway.
  serverExternalPackages: ['pdf-parse'],
  // pdfjs-dist (vía pdf-parse) carga @napi-rs/canvas dinámicamente, así que
  // el file tracing del standalone no lo detecta y /api/analyze muere en
  // Linux con "DOMMatrix is not defined". Se incluye explícito. Nota: el
  // binario nativo es por plataforma — un build de deploy hecho en macOS
  // igual necesita inyectar canvas-linux-x64-gnu (ver docs/deploy-azure.md);
  // en CI (ubuntu) sale completo.
  outputFileTracingIncludes: {
    '/api/analyze': ['./node_modules/@napi-rs/canvas/**'],
  },
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
