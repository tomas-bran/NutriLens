/**
 * Seed helpers para los E2E del chat (E05).
 *
 * Reusan el client Prisma con la misma estrategia de carga de DATABASE_URL
 * que `seed-history.ts` (parsear `.env.local` inline porque Playwright no lo
 * carga para el proceso del runner).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

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
    // .env.local opcional.
  }
}

const prisma = new PrismaClient();

export async function clearProducts() {
  await prisma.product.deleteMany();
}

/**
 * Seed para tests del chat con contexto. 3 productos donde 2 son galletitas
 * aptas para celíacos — la pregunta canónica del spec debería traer esos 2.
 */
export async function seedChatGalletitasAptas() {
  await prisma.product.createMany({
    data: [
      row({
        nombre: 'Galletitas Sin TACC X',
        categoria: 'galletitas',
        riesgo: 'bajo',
        aptoCeliaco: true,
      }),
      row({
        nombre: 'Galletitas Comunes Y',
        categoria: 'galletitas',
        riesgo: 'medio',
        aptoCeliaco: false,
        alergenos: ['gluten'],
      }),
      row({
        nombre: 'Galletitas de Arroz Z',
        categoria: 'galletitas',
        riesgo: 'bajo',
        aptoCeliaco: true,
      }),
    ],
  });
}

export async function disconnect() {
  await prisma.$disconnect();
}

interface SeedRowInput {
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
  aptoVegano?: boolean;
  aptoCeliaco?: boolean;
  aptoSinLactosa?: boolean;
  alergenos?: string[];
}

function row(input: SeedRowInput) {
  const hash = `e2e-chat-${input.nombre.toLowerCase().replace(/\s+/g, '-')}-${Math.random()
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
    explanation: 'Mock seed para E2E del chat.',
    jsonRaw: '{}',
    pipelineTrace: '[]',
    imagenPath: '/uploads/seed.jpg',
    promptVersion: 'extract_product-v1',
  };
}
