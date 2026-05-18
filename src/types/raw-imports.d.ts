/**
 * Type declaration for `import x from './foo.<ext>?raw'`.
 *
 * Webpack (Next.js) lo resuelve via `asset/source` (ver `next.config.mjs`).
 * Vite (Vitest) lo soporta nativamente. Sirve para inlinear los `.md` de
 * `src/lib/ai/prompts/` sin depender de `readFileSync(__dirname, …)` —
 * ver `docs/known-issues.md` KI-01.
 */
declare module '*?raw' {
  const content: string;
  export default content;
}
