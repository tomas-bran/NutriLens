/**
 * Empty state for `/historial` when total === 0 (spec E04 §6.2, US-26).
 * Server-component friendly — uses a Next/Link for the CTA so the page
 * doesn't need to become a client component just for navigation.
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

export function HistoryEmpty() {
  return (
    <Card
      padding="lg"
      rounded="xl"
      className="mx-auto flex max-w-md flex-col items-center gap-4 text-center"
      data-testid="history-empty"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon name="scan-eye" className="h-8 w-8" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-[18px] font-bold text-[var(--color-text)]">
          Todavía no analizaste ningún producto
        </h2>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Cuando subas tu primera etiqueta, va a aparecer acá.
        </p>
      </div>
      <Link
        href="/analizar"
        data-testid="history-empty-cta"
        className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_2px_8px_0_rgba(22,163,74,0.25)] transition-colors hover:bg-[var(--color-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
      >
        <Icon name="camera" strokeWidth={2.25} className="h-4 w-4" />
        Analizar mi primer producto
      </Link>
    </Card>
  );
}
