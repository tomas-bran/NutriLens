/**
 * Helpers para mover vectores entre JS y la columna pgvector (NL-401).
 * La columna es `Unsupported("vector(1536)")` — Prisma Client la ignora,
 * así que todo acceso pasa por $queryRaw/$executeRaw con el literal `[..]`.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export const EMBEDDING_DIMS = 1536;

/** Serializa al literal que pgvector castea con `::vector` ("[0.1,0.2,...]"). */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

/** Persiste (o reemplaza) el embedding de un producto. */
export async function upsertProductEmbedding(id: string, vector: number[]): Promise<void> {
  if (vector.length !== EMBEDDING_DIMS) {
    throw new Error(`upsertProductEmbedding: dims ${vector.length} != ${EMBEDDING_DIMS}`);
  }
  await prisma.$executeRaw(
    Prisma.sql`UPDATE "Product" SET "embedding" = ${toVectorLiteral(vector)}::vector WHERE "id" = ${id}`,
  );
}
