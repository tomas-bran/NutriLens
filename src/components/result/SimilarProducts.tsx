/**
 * <SimilarProducts> — sección "Productos similares" del detalle (NL-405).
 * RAG visible en la UI: top-K vecinos por embedding del historial.
 * Server component: recibe los items ya serializados; si no hay (producto
 * sin embedding todavía, o historial chico) no renderiza nada.
 */
import Link from 'next/link';
import { ProductImage } from '@/components/ui/ProductImage';
import type { ProductListItem } from '@/lib/products/serializers';

const RIESGO_STYLE: Record<string, string> = {
  bajo: 'bg-[var(--color-risk-low-bg)] text-[var(--color-risk-low-text)]',
  medio: 'bg-[var(--color-risk-mid-bg)] text-[var(--color-risk-mid-text)]',
  alto: 'bg-[var(--color-risk-high-bg)] text-[var(--color-risk-high-text)]',
};

export function SimilarProducts({ items }: { items: ProductListItem[] }) {
  if (items.length === 0) return null;

  return (
    <section
      data-testid="similar-products"
      aria-labelledby="similar-products-title"
      className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-5"
    >
      <h2
        id="similar-products-title"
        className="text-sm font-bold text-[var(--color-text)] md:text-base"
      >
        Productos similares del catálogo
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((p) => (
          <li key={p.id}>
            <Link
              href={`/catalogo/${p.id}`}
              data-testid="similar-product-card"
              className="flex h-full flex-col gap-2 rounded-xl border border-[var(--color-border)] p-3 transition-colors hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <ProductImage
                src={p.imagenUrl}
                alt=""
                className="h-20 w-full rounded-lg"
                iconClassName="h-7 w-7"
                sizes="160px"
              />
              <span className="line-clamp-2 text-xs font-semibold text-[var(--color-text)]">
                {p.nombre}
              </span>
              <span
                className={`mt-auto w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${RIESGO_STYLE[p.riesgo] ?? ''}`}
              >
                riesgo {p.riesgo}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
