/**
 * `/historial` — listado paginado de productos analizados.
 * Spec: `docs/specs/E04-persistencia-e-historial.md §6.1 / §6.2` (US-23, US-26).
 *
 * Server Component. Pagina por search param `?page=N`. La paginación
 * server-side mantiene el back/forward del navegador funcional sin JS.
 */
import { AppShell } from '@/components/layout/AppShell';
import { HistoryListView } from '@/components/history/HistoryListView';
import { prisma } from '@/lib/db';
import { getHistorialCount } from '@/lib/products/count';
import { toListItem } from '@/lib/products/serializers';

export const metadata = {
  title: 'Historial · NutriLens',
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function HistorialPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parsePage(params.page);

  const [items, total, historialCount] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count(),
    getHistorialCount(),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE);
  const listItems = items.map(toListItem);

  return (
    <AppShell active="historial" historialCount={historialCount}>
      <HistoryListView items={listItems} page={page} totalPages={totalPages} total={total} />
    </AppShell>
  );
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}
