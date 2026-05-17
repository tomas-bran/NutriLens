/**
 * <HistoryListView> — `/historial` body (spec E04 §6.1 / §6.3 / §6.4).
 *
 * Pure presentational: parent Server Component fetches items via Prisma,
 * passes the list + pagination + filter state. Three terminal states:
 *   - total === 0 && no filters    → <HistoryEmpty>      (US-26)
 *   - total === 0 && has filters   → <HistoryNoResults>  (US-24 §AC5)
 *   - total > 0                    → grid + pagination
 */
import Link from 'next/link';
import { ActiveFilterChips } from './ActiveFilterChips';
import { HistoryEmpty } from './HistoryEmpty';
import { HistoryFilters } from './HistoryFilters';
import { HistoryItemCard } from './HistoryItemCard';
import { HistoryNoResults } from './HistoryNoResults';
import { HistoryPagination } from './HistoryPagination';
import { Icon } from '@/components/ui/Icon';
import {
  hasActiveFilters,
  type HistoryFilters as HistoryFiltersValue,
} from '@/lib/products/history-filters';
import type { ProductListItem } from '@/lib/products/serializers';

export interface HistoryListViewProps {
  items: ReadonlyArray<ProductListItem>;
  page: number;
  totalPages: number;
  total: number;
  filters: HistoryFiltersValue;
}

export function HistoryListView({ items, page, totalPages, total, filters }: HistoryListViewProps) {
  const filtersActive = hasActiveFilters(filters);
  return (
    <div className="flex flex-col gap-6 px-4 py-2 md:px-6 md:py-6" data-testid="history-view">
      <HistoryHeader total={total} />

      <HistoryFilters value={filters} />
      <ActiveFilterChips filters={filters} />

      {total === 0 ? (
        filtersActive ? (
          <HistoryNoResults />
        ) : (
          <HistoryEmpty />
        )
      ) : (
        <>
          <ul
            role="list"
            data-testid="history-grid"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            {items.map((item) => (
              <li key={item.id}>
                <HistoryItemCard item={item} />
              </li>
            ))}
          </ul>
          <HistoryPagination page={page} totalPages={totalPages} filters={filters} />
        </>
      )}
    </div>
  );
}

function HistoryHeader({ total }: { total: number }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-[26px] font-bold leading-tight text-[var(--color-text)]">Historial</h1>
        {total > 0 && (
          <p className="text-[13px] text-[var(--color-text-muted)]" data-testid="history-total">
            {total === 1 ? '1 producto analizado' : `${total} productos analizados`}
          </p>
        )}
      </div>
      <Link
        href="/analizar"
        data-testid="history-new-analysis"
        className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-[13px] font-bold text-white shadow-[0_2px_8px_0_rgba(22,163,74,0.25)] transition-colors hover:bg-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
      >
        <Icon name="camera" strokeWidth={2.25} className="h-4 w-4" />
        Nuevo análisis
      </Link>
    </header>
  );
}
