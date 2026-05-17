/**
 * `/historial` — listado paginado y filtrable.
 * Spec: `docs/specs/E04 §6.1 / §6.4` (US-23, US-24, US-26).
 *
 * Server Component. Lee `searchParams`, los pasa por `parseHistoryFilters`
 * para coercear/validar, y traduce a un `Prisma.ProductWhereInput`. Cualquier
 * combinación produce un AND (US-24 §AC4). Page se mantiene en el URL.
 */
import type { Prisma } from '@prisma/client';
import { AppShell } from '@/components/layout/AppShell';
import { HistoryListView } from '@/components/history/HistoryListView';
import { prisma } from '@/lib/db';
import { getHistorialCount } from '@/lib/products/count';
import { parseHistoryFilters, type RawSearchParams } from '@/lib/products/history-filters';
import { mapCategoriaToPrisma, toListItem } from '@/lib/products/serializers';

export const metadata = {
  title: 'Historial · NutriLens',
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

interface PageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function HistorialPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const filters = parseHistoryFilters(raw);

  const where: Prisma.ProductWhereInput = {};
  if (filters.categoria) where.categoria = mapCategoriaToPrisma(filters.categoria);
  if (filters.riesgo) where.riesgo = filters.riesgo;
  if (filters.q) where.nombre = { contains: filters.q, mode: 'insensitive' };
  if (filters.alergeno) {
    // `alergenos` is JSON-stringified text in Postgres; substring search on
    // the quoted token is good enough (same approach as GET /api/products).
    where.alergenos = { contains: `"${filters.alergeno}"` };
  }
  if (filters.apto === 'vegano') where.aptoVegano = true;
  if (filters.apto === 'celiaco') where.aptoCeliaco = true;
  if (filters.apto === 'sin_lactosa') where.aptoSinLactosa = true;

  const [items, total, historialCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    getHistorialCount(),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE);

  return (
    <AppShell active="historial" historialCount={historialCount}>
      <HistoryListView
        items={items.map(toListItem)}
        page={filters.page}
        totalPages={totalPages}
        total={total}
        filters={filters}
      />
    </AppShell>
  );
}
