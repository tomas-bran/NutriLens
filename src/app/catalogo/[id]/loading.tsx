/**
 * Fallback de carga para `/catalogo/[id]` — esqueleto del detalle mientras el
 * server resuelve el producto.
 */
import { AppShell } from '@/components/layout/AppShell';
import { ResultSkeleton } from '@/components/result/ResultSkeleton';

export default function Loading() {
  return (
    <AppShell active="catalogo" fluid>
      <ResultSkeleton />
    </AppShell>
  );
}
