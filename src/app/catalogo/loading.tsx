/**
 * Fallback de carga para `/catalogo` (la lista). Sin esto, la navegación a una
 * página `force-dynamic` espera al render completo del server (la request queda
 * "pending" y la transición se siente lenta). Con este skeleton, Next muestra
 * algo al instante y streamea el contenido cuando llega.
 */
import { AppShell } from '@/components/layout/AppShell';

export default function Loading() {
  return (
    <AppShell active="catalogo">
      <div className="flex flex-col gap-6 px-4 py-2 md:px-6 md:py-6" aria-busy="true">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-44 animate-pulse rounded-lg bg-[var(--color-surface)]" />
            <div className="h-4 w-28 animate-pulse rounded bg-[var(--color-surface)]" />
          </div>
        </div>

        {/* Barra de filtros */}
        <div className="h-12 w-full animate-pulse rounded-2xl bg-[var(--color-surface)]" />

        {/* Grilla de tarjetas */}
        <ul
          role="list"
          className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
          aria-hidden="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
            />
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
