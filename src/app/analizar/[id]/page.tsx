/**
 * `/analizar/[id]` — Analysis result screen.
 *
 * Spec: `docs/specs/E03-clasificacion-reglas-explicacion.md §6.1`.
 * Pencil refs: `M05-Resultado` (mobile) + `D03-Resultado` (desktop).
 *
 * Server Component: fetches the persisted product through Prisma and
 * passes the serialized detail down to <ResultView>. If the id doesn't
 * resolve we trigger the Next.js 404 segment.
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
  title: 'Resultado · NutriLens',
};

export const dynamic = 'force-dynamic';

export default async function AnalizarResultPage({ params }: PageProps) {
  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } }).catch(() => null);
  if (!product) {
    notFound();
  }

  const detail = toDetail(product);
  const [historialCount, isAdmin] = await Promise.all([getHistorialCount(), isCurrentUserAdmin()]);

  return (
    <AppShell active="analizar" historialCount={historialCount}>
      <ResultView product={detail} showTechnicalViews={isAdmin} />
    </AppShell>
  );
}
