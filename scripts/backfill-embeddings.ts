/**
 * Backfill de embeddings (NL-401): embebe todos los productos sin embedding.
 *
 * Uso (local):  DATABASE_URL=... IA_PROVIDER=azure-openai npx tsx scripts/backfill-embeddings.ts
 * Uso (prod):   apuntar DATABASE_URL a la DB de Azure con las mismas vars de IA.
 * Re-ejecutable: solo procesa filas con embedding NULL.
 */
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { buildProductEmbeddingText } from '../src/lib/rag/embedding-text';
import { mapCategoriaFromPrisma } from '../src/lib/products/serializers';

// SDK directo (no getIaProvider): el módulo de prompts usa imports `?raw`
// que tsx no resuelve (KI-01). Para embeddings alcanza con el client pelado.
function makeEmbedder() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const key = process.env.AZURE_OPENAI_KEY;
  if (!endpoint || !key) throw new Error('Faltan AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_KEY');
  const client = new OpenAI({ baseURL: endpoint, apiKey: key });
  const model = process.env.AZURE_OPENAI_MODEL_EMBEDDINGS ?? 'text-embedding-3-small';
  return async (text: string): Promise<number[]> => {
    const r = await client.embeddings.create({ model, input: text });
    const vector = r.data[0]?.embedding ?? [];
    if (vector.length === 0) throw new Error('embedding vacío');
    return vector;
  };
}

const prisma = new PrismaClient();

function parseArr(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function main() {
  const embed = makeEmbedder();
  const pending = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Product" WHERE "embedding" IS NULL`;
  console.log(`[backfill] ${pending.length} productos sin embedding`);

  let ok = 0;
  let failed = 0;
  for (const { id } of pending) {
    const p = await prisma.product.findUnique({ where: { id } });
    if (!p) continue;
    try {
      const vector = await embed(
        buildProductEmbeddingText({
          nombre: p.nombre,
          categoria: mapCategoriaFromPrisma(p.categoria),
          ingredientes: parseArr(p.ingredientes),
          alergenos: parseArr(p.alergenos),
          sellos: parseArr(p.sellos),
          aptoVegano: p.aptoVegano,
          aptoCeliaco: p.aptoCeliaco,
          aptoSinLactosa: p.aptoSinLactosa,
        }),
      );
      await prisma.$executeRawUnsafe(
        `UPDATE "Product" SET "embedding" = $1::vector WHERE "id" = $2`,
        `[${vector.join(',')}]`,
        id,
      );
      ok++;
    } catch (err) {
      failed++;
      console.error(`[backfill] falló ${id}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`[backfill] listo — ok: ${ok}, fallidos: ${failed}`);
}

main().finally(() => prisma.$disconnect());
