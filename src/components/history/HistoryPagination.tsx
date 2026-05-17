/**
 * Server-rendered prev / next pagination for `/historial`.
 * Preserves active filters in each page link so navigating doesn't reset them.
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { buildHistoryUrl, type HistoryFilters } from '@/lib/products/history-filters';

export interface HistoryPaginationProps {
  page: number;
  totalPages: number;
  filters: HistoryFilters;
}

export function HistoryPagination({ page, totalPages, filters }: HistoryPaginationProps) {
  if (totalPages <= 1) return null;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      data-testid="history-pagination"
      aria-label="Paginación del historial"
      className="flex items-center justify-between border-t border-[var(--color-border)] pt-4"
    >
      <p className="text-[12px] text-[var(--color-text-muted)]">
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <PageLink page={page - 1} filters={filters} enabled={hasPrev} direction="prev" />
        <PageLink page={page + 1} filters={filters} enabled={hasNext} direction="next" />
      </div>
    </nav>
  );
}

function PageLink({
  page,
  filters,
  enabled,
  direction,
}: {
  page: number;
  filters: HistoryFilters;
  enabled: boolean;
  direction: 'prev' | 'next';
}) {
  const label = direction === 'prev' ? 'Anterior' : 'Siguiente';
  const className = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-bold transition-colors',
    enabled
      ? 'border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2'
      : 'cursor-not-allowed border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] opacity-60',
  );

  if (!enabled) {
    return (
      <span aria-disabled="true" className={className} data-testid={`history-page-${direction}`}>
        {direction === 'prev' && <Icon name="arrow-right" className="h-3.5 w-3.5 rotate-180" />}
        {label}
        {direction === 'next' && <Icon name="arrow-right" className="h-3.5 w-3.5" />}
      </span>
    );
  }
  return (
    <Link
      href={buildHistoryUrl({ ...filters, page })}
      className={className}
      data-testid={`history-page-${direction}`}
      scroll={false}
    >
      {direction === 'prev' && <Icon name="arrow-right" className="h-3.5 w-3.5 rotate-180" />}
      {label}
      {direction === 'next' && <Icon name="arrow-right" className="h-3.5 w-3.5" />}
    </Link>
  );
}
