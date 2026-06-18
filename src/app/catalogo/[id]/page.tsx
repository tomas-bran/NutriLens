/**
 * `/catalogo/[id]` — detalle de un producto del catálogo.
 *
 * Spec: `docs/specs/E04-persistencia-e-historial.md §6.5` — reutiliza
 * <ResultView> con `back` apuntando a `/catalogo` y un eyebrow
 * contextual "Producto guardado".
 */
import { notFound } from 'next/navigation';
import { AdminProductControls } from '@/components/result/AdminProductControls';
import { AppShell } from '@/components/layout/AppShell';
import { ResultView } from '@/components/result/ResultView';
import { isCurrentUserAdmin } from '@/lib/auth/is-admin';
import { prisma } from '@/lib/db';
import { getCatalogoCount } from '@/lib/products/count';
import { findSimilarProducts } from '@/lib/rag/semantic-search';
import { SimilarProducts } from '@/components/result/SimilarProducts';
import { toDetail, toListItem } from '@/lib/products/serializers';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Detalle · NutriLens',
};

export const dynamic = 'force-dynamic';

export default async function CatalogoDetailPage({ params }: PageProps) {
  const { id } = await params;

  const product = await prisma.product
    .findFirst({ where: { id, deletedAt: null } })
    .catch(() => null);
  if (!product) {
    notFound();
  }

  const detail = toDetail(product);
  // NL-405: vecinos por embedding — findSimilarProducts es fail-open ([]).
  const [catalogoCount, isAdmin, similares] = await Promise.all([
    getCatalogoCount(),
    isCurrentUserAdmin(),
    findSimilarProducts(id, 4),
  ]);

  return (
    <AppShell active="catalogo" catalogoCount={catalogoCount} fluid>
      <div className="flex flex-col gap-4">
        <ResultView
          product={detail}
          back={{ href: '/catalogo', label: 'Volver al catálogo' }}
          contextLabel="Producto guardado"
          showTechnicalViews={isAdmin}
        />
        {isAdmin && <AdminProductControls productId={detail.id} currentName={detail.nombre} />}
        <SimilarProducts items={similares.map(toListItem)} />
      </div>
    </AppShell>
  );
}
