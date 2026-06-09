import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // E2E comparten un único Postgres + `/uploads`. Si dos workers corren
  // specs que clean/seedean al mismo tiempo se pisan entre sí (ver pattern
  // en `vitest.config.ts` con `fileParallelism: false`). Mantenemos
  // `fullyParallel: true` dentro de cada spec; sólo bajamos workers globales.
  workers: 1,
  reporter: process.env.CI ? [['html'], ['github']] : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // US-34: el <JsonViewer> usa `navigator.clipboard.writeText`. En CI
    // Chromium headless no concede permisos de clipboard por default y la
    // call rechaza silenciosamente, por eso el feedback "¡Copiado!" no
    // se dispara. Habilitamos ambos permisos a nivel global.
    permissions: ['clipboard-read', 'clipboard-write'],
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    command: 'npm run build && npm start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      IA_PROVIDER: 'mock',
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgresql://nutrilens:nutrilens@localhost:5432/nutrilens',
      // El step `enrich_with_off` hace fetch real a Open Food Facts. En E2E
      // con MockIaProvider el resultado es no-determinístico (depende de qué
      // matches devuelva OFF para "Mock Product") y puede mutar riesgo y
      // alérgenos del producto fixture, rompiendo aserciones tipo
      // `expectRiskLevel('bajo')`. Lo desactivamos — su feature tiene
      // cobertura propia en unit + integration tests.
      OFF_ENABLED: 'false',
    },
  },
});
