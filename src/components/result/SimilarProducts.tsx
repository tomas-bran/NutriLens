/**
 * <SimilarProducts> — sección "Productos similares" del detalle (NL-405).
 * RAG visible en la UI: top-K vecinos por embedding del historial.
 * Server component: recibe los items ya serializados; si no hay (producto
 * sin embedding todavía, o historial chico) no renderiza nada.
 */
import Image from 'next/image';
import Link from 'next/link';
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
        Productos similares de tu historial
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((p) => (
          <li key={p.id}>
            <Link
              href={`/historial/${p.id}`}
              data-testid="similar-product-card"
              className="flex h-full flex-col gap-2 rounded-xl border border-[var(--color-border)] p-3 transition-colors hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <div className="relative h-20 w-full overflow-hidden rounded-lg bg-[var(--color-bg)]">
                <Image
                  src={p.imagenUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="160px"
                  className="object-cover"
                />
              </div>
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
