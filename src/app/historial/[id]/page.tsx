/**
 * `/historial/[id]` — detalle de un producto del historial.
 *
 * Spec: `docs/specs/E04-persistencia-e-historial.md §6.5` — reutiliza
 * <ResultView> con `back` apuntando a `/historial` y un eyebrow
 * contextual "Producto guardado".
 */
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ResultView } from '@/components/result/ResultView';
import { isCurrentUserAdmin } from '@/lib/auth/is-admin';
import { prisma } from '@/lib/db';
import { getHistorialCount } from '@/lib/products/count';
import { toDetail } from '@/lib/products/serializers';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Detalle · NutriLens',
};

export const dynamic = 'force-dynamic';

export default async function HistorialDetailPage({ params }: PageProps) {
  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } }).catch(() => null);
  if (!product) {
    notFound();
  }

  const detail = toDetail(product);
  const [historialCount, isAdmin] = await Promise.all([getHistorialCount(), isCurrentUserAdmin()]);

  return (
    <AppShell active="historial" historialCount={historialCount}>
      <ResultView
        product={detail}
        back={{ href: '/historial', label: 'Volver al historial' }}
        contextLabel="Producto guardado"
        showTechnicalViews={isAdmin}
      />
    </AppShell>
  );
}
