/**
 * Fallback de carga para `/analizar/[id]` — muestra el esqueleto del resultado
 * mientras el server resuelve el producto (en vez de la página con solo labels).
 */
import { AppShell } from '@/components/layout/AppShell';
import { ResultSkeleton } from '@/components/result/ResultSkeleton';

export default function Loading() {
  return (
    <AppShell active="analizar" fluid>
      <ResultSkeleton />
    </AppShell>
  );
}
