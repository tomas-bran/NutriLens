/**
 * "Tu historial" card — rendered only when the user already has products
 * analyzed (US-07 escenario 2). Links to `/historial`.
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export interface HistoryCardProps {
  count: number;
}

export function HistoryCard({ count }: HistoryCardProps) {
  const subtitle = formatSubtitle(count);

  return (
    <Card
      padding="md"
      className="flex flex-col gap-3 !rounded-[14px] !p-4 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <HistoryIcon />
        </span>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[14px] font-bold text-[var(--color-text)]">Tu historial</h3>
          <p className="text-[12px] text-[var(--color-text-muted)]">{subtitle}</p>
        </div>
      </div>
      <Link
        href="/historial"
        data-testid="history-cta"
        className="inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-[13px] font-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 md:self-auto"
      >
        Ver historial
        <ArrowRightIcon />
      </Link>
    </Card>
  );
}

function formatSubtitle(count: number): string {
  if (count === 1) return 'Ya analizaste 1 producto.';
  return `Ya analizaste ${count} productos.`;
}

function HistoryIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M5 12h14" />
      <path d="M13 5l7 7-7 7" />
    </svg>
  );
}
