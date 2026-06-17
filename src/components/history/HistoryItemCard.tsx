/**
 * Single product card in the `/catalogo` grid (spec E04 §6.1).
 *
 * Layout (Claude Design `DeskProductCard`): tarjeta vertical con la foto del
 * producto arriba (full-width), badge de riesgo flotante sobre la imagen, y
 * debajo el nombre + categoría·fecha + chips de alérgenos. Toda la tarjeta es
 * un link al detalle. En el grid (`md:grid-cols-2 xl:grid-cols-3`) quedan como
 * una galería de productos analizados.
 */
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProductImage } from '@/components/ui/ProductImage';
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
      href={`/catalogo/${item.id}`}
      data-testid={`catalogo-item-${item.id}`}
      // `h-full` makes every card stretch to the tallest neighbor in the grid
      // row — items without allergens render at the same height as those with
      // a stack of chips.
      className="group block h-full focus-visible:outline-none"
    >
      <Card
        padding="none"
        rounded="xl"
        className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-[var(--color-primary)] group-focus-visible:ring-offset-2"
      >
        {/* Visual superior + badge de riesgo flotante (top:20/right:20 = p-3 + 8) */}
        <div className="relative p-3">
          <ProductThumb item={item} />
          <Badge
            variant={RISK_BADGE_VARIANT[item.riesgo]}
            className="absolute right-5 top-5 shadow-sm"
          >
            {RISK_LABEL[item.riesgo]}
          </Badge>
        </div>

        {/* Cuerpo */}
        <div className="flex flex-1 flex-col gap-1 px-4 pb-4 pt-1">
          <h3 className="truncate text-[15.5px] font-bold text-[var(--color-text)]">
            {item.nombre}
          </h3>
          <p className="truncate text-[12.5px] text-[var(--color-text-muted)]">
            <span className="capitalize">{item.categoria}</span> ·{' '}
            {formatRelativeDate(item.createdAt)}
          </p>
          {item.alergenos.length > 0 ? (
            <ul
              role="list"
              aria-label="Alérgenos"
              className="mt-2 flex flex-wrap gap-1.5"
              data-testid="catalogo-item-allergens"
            >
              {item.alergenos.map((a) => (
                <li
                  key={a}
                  className="inline-flex items-center rounded-full bg-[var(--color-danger-bg)] px-2 py-0.5 text-[11px] font-semibold capitalize text-[var(--color-risk-high)]"
                >
                  {a}
                </li>
              ))}
            </ul>
          ) : (
            <span
              data-testid="catalogo-item-no-allergens"
              className="mt-2 inline-flex w-fit items-center rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary-strong)]"
            >
              sin alérgenos
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

function ProductThumb({ item }: { item: ProductListItem }) {
  return (
    <ProductImage
      src={item.imagenUrl}
      alt={`Foto de ${item.nombre}`}
      className="h-[140px] w-full rounded-[14px]"
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
    />
  );
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
