/**
 * `/` — Home (US-07, spec `docs/specs/E01-onboarding-y-upload.md §8`).
 *
 * Server Component: counts persisted products via Prisma to decide whether
 * to render the "Tu historial" card. If the DB is unreachable (dev without
 * docker up, build-time, etc.) we treat the count as 0 — the card hides
 * gracefully and the rest of the page still renders.
 */
import { HomeView } from '@/components/home/HomeView';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// History count depends on persisted state; opting out of static rendering
// avoids serving a stale "0 productos" card on prod after a successful upload.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const historyCount = await safeCountProducts();
  return <HomeView historyCount={historyCount} />;
}

async function safeCountProducts(): Promise<number> {
  try {
    return await prisma.product.count();
  } catch (err) {
    logger.warn('home.product_count_failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}
