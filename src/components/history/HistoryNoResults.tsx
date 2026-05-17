/**
 * "Sin resultados con filtros" empty state (US-24 §AC5, spec §6.3).
 * Distinto del <HistoryEmpty>: éste se muestra cuando hay productos en DB
 * pero ninguno cumple los filtros activos. CTA → limpiar filtros.
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { buildHistoryUrl } from '@/lib/products/history-filters';

export function HistoryNoResults() {
  return (
    <Card
      padding="lg"
      rounded="xl"
      className="mx-auto flex max-w-md flex-col items-center gap-4 text-center"
      data-testid="history-no-results"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)]">
        <Icon name="scan-line" className="h-8 w-8" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-[18px] font-bold text-[var(--color-text)]">
          No encontramos productos con esos filtros
        </h2>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Probá quitar alguno o limpiá todos los filtros para ver el listado completo.
        </p>
      </div>
      <Link
        href={buildHistoryUrl({ page: 1 })}
        data-testid="history-no-results-clear"
        scroll={false}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_2px_8px_0_rgba(22,163,74,0.25)] transition-colors hover:bg-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
      >
        Limpiar filtros
      </Link>
    </Card>
  );
}
