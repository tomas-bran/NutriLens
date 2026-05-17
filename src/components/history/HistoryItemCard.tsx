/**
 * Single product card in the `/historial` grid (spec E04 §6.1).
 * Mobile: full-width row. Desktop: grid cell. Whole card is a link to detail.
 */
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { ProductListItem } from '@/lib/products/serializers';

const RISK_BADGE_VARIANT = {
  bajo: 'risk-low',
  medio: 'risk-medium',
  alto: 'risk-high',
} as const;

const RISK_LABEL = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
} as const;

export function HistoryItemCard({ item }: { item: ProductListItem }) {
  return (
    <Link
      href={`/historial/${item.id}`}
      data-testid={`history-item-${item.id}`}
      // `h-full` makes every card stretch to the tallest neighbor in the grid
      // row — items without allergens render at the same size as those with
      // a stack of chips.
      className="group block h-full focus-visible:outline-none"
    >
      <Card
        padding="md"
        className="flex h-full items-start gap-3 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-[var(--color-primary)] group-focus-visible:ring-offset-2"
      >
        <ProductThumb item={item} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] font-bold text-[var(--color-text)]">
              {item.nombre}
            </h3>
            <Badge variant={RISK_BADGE_VARIANT[item.riesgo]}>{RISK_LABEL[item.riesgo]}</Badge>
          </div>
          <p className="truncate text-[12px] text-[var(--color-text-muted)]">
            <span className="capitalize">{item.categoria}</span> ·{' '}
            {formatRelativeDate(item.createdAt)}
          </p>
          {item.alergenos.length > 0 && (
            <ul
              role="list"
              aria-label="Alérgenos"
              className="mt-1 flex flex-wrap gap-1.5"
              data-testid="history-item-allergens"
            >
              {item.alergenos.map((a) => (
                <li
                  key={a}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-risk-high)]"
                >
                  {capitalize(a)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Icon
          name="arrow-right"
          className={cn(
            'mt-1.5 h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]',
            'transition-transform group-hover:translate-x-0.5',
          )}
        />
      </Card>
    </Link>
  );
}

function ProductThumb({ item }: { item: ProductListItem }) {
  if (item.imagenUrl) {
    return (
      <Image
        src={item.imagenUrl}
        alt={`Foto de ${item.nombre}`}
        width={64}
        height={64}
        unoptimized
        className="h-16 w-16 flex-shrink-0 rounded-[10px] object-cover"
      />
    );
  }
  return (
    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
      <Icon name="scan-eye" className="h-7 w-7" />
    </div>
  );
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Approximate relative formatter — keeps it client-tz neutral and adequate
 * for a demo. "hace 1 min" / "hace 2 h" / "hace 3 d" / actual date for >7d.
 */
function formatRelativeDate(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  const m = Math.floor(elapsed / 60_000);
  if (m < 1) return 'hace instantes';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}
