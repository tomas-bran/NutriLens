/**
 * Chips removibles para cada filtro activo (US-24 §6.4).
 * Server-rendered: cada chip lleva a la URL del listado sin ese filtro.
 *
 * Incluye al final "Limpiar todo" cuando hay >1 chip.
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import {
  buildHistoryUrl,
  clearFilter,
  describeActiveFilters,
  type HistoryFilters,
} from '@/lib/products/history-filters';

export function ActiveFilterChips({ filters }: { filters: HistoryFilters }) {
  const active = describeActiveFilters(filters);
  if (active.length === 0) return null;

  return (
    <div
      data-testid="active-filter-chips"
      role="region"
      aria-label="Filtros activos"
      className="flex flex-wrap items-center gap-2"
    >
      {active.map((chip) => {
        const cleared = clearFilter(filters, chip.key);
        return (
          <Link
            key={chip.key}
            href={buildHistoryUrl(cleared)}
            data-testid={`filter-chip-${chip.key}`}
            scroll={false}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-[12px] font-bold text-[var(--color-primary-strong)] transition-colors hover:bg-[var(--color-success-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            <span>{chip.label}</span>
            <Icon name="close" className="h-3 w-3" strokeWidth={2.5} />
            <span className="sr-only">Quitar filtro</span>
          </Link>
        );
      })}

      {active.length > 1 && (
        <Link
          href={buildHistoryUrl({ page: 1 })}
          data-testid="filter-clear-all"
          scroll={false}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-bold text-[var(--color-text-muted)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
        >
          Limpiar todo
        </Link>
      )}
    </div>
  );
}
