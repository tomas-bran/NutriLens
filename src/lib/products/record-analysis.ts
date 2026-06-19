import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * "Analizados por vos": registra que `userId` analizó `productId`. Idempotente
 * (upsert por la PK compuesta) — re-analizar el mismo producto no duplica ni
 * falla. Se llama desde `/api/analyze` tras `persist`, incluso en el camino de
 * dedup, así un producto ya existente igual queda vinculado al usuario.
 *
 * **Fail-open**: un fallo del vínculo NUNCA debe romper un análisis ya
 * computado. Logueamos y seguimos — el catálogo compartido es la fuente de
 * verdad; el vínculo por-usuario es accesorio.
 */
export async function recordUserAnalysis(userId: string, productId: string): Promise<void> {
  try {
    await prisma.productAnalysis.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
  } catch (err) {
    logger.warn('product_analysis.link_failed', {
      userId,
      productId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
