import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@schemas': path.resolve(__dirname, './src/packages/schemas'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules', '.next'],
    // Integration tests share a single Postgres + a single /uploads directory;
    // running test files in parallel causes deleteMany() in one file to wipe
    // rows another file is asserting against. Disable file-level parallelism
    // to keep tests deterministic. Unit tests still run synchronously within
    // a file so the overall hit is small (~2x).
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/**/*.{ts,tsx}',
        'src/packages/schemas/**/*.ts',
        'src/app/**/*.tsx',
        'src/components/**/*.{ts,tsx}',
        // E07 eval harness — only the pure modules. The CLI entry (`run-eval.ts`)
        // is an executable wrapper with process.exit + console.* and isn't worth
        // testing through coverage.
        'evals/runner/metrics.ts',
        'evals/runner/reporter.ts',
        'evals/runner/cli.ts',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/index.ts',
        '**/types.ts',
        'src/lib/ai/mock-provider.ts',
        'src/lib/db.ts',
        // Sprint 0 placeholders — drop these entries when US-07 lands the real screens.
        'src/app/layout.tsx',
        'src/app/page.tsx',
      ],
      // Hard thresholds — CI fails if any drops below.
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
});
