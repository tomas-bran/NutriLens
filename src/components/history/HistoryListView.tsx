/**
 * <HistoryListView> — `/historial` body (spec E04 §6.1).
 *
 * Pure presentational: parent Server Component fetches items via Prisma,
 * passes the list + pagination params. Empty state when total === 0.
 */
import Link from 'next/link';
import { HistoryEmpty } from './HistoryEmpty';
import { HistoryItemCard } from './HistoryItemCard';
import { HistoryPagination } from './HistoryPagination';
import { Icon } from '@/components/ui/Icon';
import type { ProductListItem } from '@/lib/products/serializers';

export interface HistoryListViewProps {
  items: ReadonlyArray<ProductListItem>;
  page: number;
  totalPages: number;
  total: number;
}

export function HistoryListView({ items, page, totalPages, total }: HistoryListViewProps) {
  if (total === 0) {
    return (
      <div className="flex flex-col gap-6 px-4 py-2 md:px-6 md:py-6" data-testid="history-view">
        <HistoryHeader total={0} />
        <HistoryEmpty />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-2 md:px-6 md:py-6" data-testid="history-view">
      <HistoryHeader total={total} />

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

      <HistoryPagination page={page} totalPages={totalPages} />
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
