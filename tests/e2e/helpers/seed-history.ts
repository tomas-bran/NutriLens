/**
 * Seed helper for /catalogo filter E2Es (US-24).
 *
 * Inserts a deterministic set of products with varied categoría/riesgo/alérgenos
 * so the filter selectors actually have something to discriminate between.
 * Each test that uses this helper calls `clearHistory()` first to start clean.
 *
 * Talks to the same Postgres the dev server is using (DATABASE_URL).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

// Playwright doesn't load `.env.local` for the test runner process (only for
// the webServer it spawns). We parse it inline so Prisma sees DATABASE_URL
// without adding a runtime dep on `dotenv`.
if (!process.env.DATABASE_URL) {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (!match || !match[1] || match[2] === undefined) continue;
      const key = match[1];
      const value = match[2];
      if (!(key in process.env)) {
        process.env[key] = value.replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {
    // .env.local optional; if Prisma still can't find DATABASE_URL it errors loudly.
  }
}

const prisma = new PrismaClient();

interface SeedProductInput {
  nombre: string;
  categoria:
    | 'galletitas'
    | 'cereales'
    | 'snacks'
    | 'lacteos'
    | 'bebidas'
    | 'sin_tacc'
    | 'veganos'
    | 'otros';
  riesgo: 'bajo' | 'medio' | 'alto';
  alergenos?: string[];
  aptoVegano?: boolean;
  aptoCeliaco?: boolean;
  aptoSinLactosa?: boolean;
}

function makeRow(input: SeedProductInput) {
  const hash = `e2e-${input.nombre.toLowerCase().replace(/\s+/g, '-')}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  return {
    fileHash: hash,
    nombre: input.nombre,
    categoria: input.categoria,
    ingredientes: JSON.stringify([]),
    alergenos: JSON.stringify(input.alergenos ?? []),
    sellos: JSON.stringify([]),
    aptoVegano: input.aptoVegano ?? false,
    aptoCeliaco: input.aptoCeliaco ?? false,
    aptoSinLactosa: input.aptoSinLactosa ?? false,
    riesgo: input.riesgo,
    confidence: 0.9,
    reglasAplicadas: JSON.stringify([]),
    explanation: 'Mock seed product for E2E.',
    jsonRaw: '{}',
    pipelineTrace: '[]',
    imagenPath: '/uploads/seed.jpg',
    promptVersion: 'extract_product-v1',
  };
}

export async function clearHistory() {
  await prisma.product.deleteMany();
}

export async function seedFilterFixture() {
  await prisma.product.createMany({
    data: [
      makeRow({
        nombre: 'Galletitas Choco',
        categoria: 'galletitas',
        riesgo: 'alto',
        alergenos: ['gluten', 'leche'],
      }),
      makeRow({
        nombre: 'Galletitas Limón',
        categoria: 'galletitas',
        riesgo: 'medio',
        alergenos: ['gluten'],
      }),
      makeRow({
        nombre: 'Cereales con miel',
        categoria: 'cereales',
        riesgo: 'medio',
        alergenos: ['gluten'],
      }),
      makeRow({
        nombre: 'Snack de papa',
        categoria: 'snacks',
        riesgo: 'alto',
        alergenos: [],
      }),
      makeRow({
        nombre: 'Yogur natural',
        categoria: 'lacteos',
        riesgo: 'bajo',
        alergenos: ['leche'],
        aptoSinLactosa: false,
      }),
    ],
  });
}

export async function disconnect() {
  await prisma.$disconnect();
}
