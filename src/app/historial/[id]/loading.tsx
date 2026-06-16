/**
 * Fallback de carga para `/historial/[id]` — esqueleto del detalle mientras el
 * server resuelve el producto.
 */
import { AppShell } from '@/components/layout/AppShell';
import { ResultSkeleton } from '@/components/result/ResultSkeleton';

export default function Loading() {
  return (
    <AppShell active="historial" fluid>
      <ResultSkeleton />
    </AppShell>
  );
}
