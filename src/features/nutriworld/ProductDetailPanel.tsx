'use client';

/**
 * Ficha 2D del producto seleccionado (se abre con E al estar cerca, o click).
 * Panel lateral derecho con riesgo, aptitudes, ingredientes, alérgenos, sellos
 * y la explicación.
 */
import { Icon } from '@/components/ui/Icon';
import { getProductById } from './data/products';
import type { NutriProduct } from './data/products';
import { selectProduct, useNutriWorld } from './store/useNutriWorldStore';

const RISK_STYLE: Record<NutriProduct['risk'], string> = {
  bajo: 'bg-[var(--color-risk-low-bg)] text-[var(--color-risk-low-text)]',
  medio: 'bg-[var(--color-risk-mid-bg)] text-[var(--color-risk-mid-text)]',
  alto: 'bg-[var(--color-risk-high-bg)] text-[var(--color-risk-high-text)]',
};

function AptRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm">
      <span className="text-[var(--color-text)]">{label}</span>
      <span
        className={
          ok
            ? 'font-semibold text-[var(--color-primary)]'
            : 'font-semibold text-[var(--color-risk-high-text)]'
        }
      >
        {ok ? 'Sí' : 'No'}
      </span>
    </div>
  );
}

export function ProductDetailPanel() {
  const selectedId = useNutriWorld((s) => s.selectedProductId);
  const product = selectedId ? getProductById(selectedId) : undefined;
  if (!product) return null;

  return (
    <div
      data-testid="nutriworld-detail"
      className="bg-white/97 pointer-events-auto absolute bottom-24 right-4 top-4 w-[min(92vw,360px)] overflow-y-auto rounded-2xl border border-[var(--color-border)] p-5 shadow-2xl backdrop-blur"
      role="dialog"
      aria-label={`Ficha de ${product.name}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-lg font-bold text-[var(--color-text)]">{product.name}</h2>
        <button
          type="button"
          onClick={() => selectProduct(null)}
          aria-label="Cerrar ficha"
          data-testid="nutriworld-detail-close"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      <span
        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase ${RISK_STYLE[product.risk]}`}
      >
        Riesgo {product.risk}
      </span>

      <div className="mt-4 flex flex-col gap-2">
        <AptRow label="Apto celíaco" ok={product.aptoCeliaco} />
        <AptRow label="Apto sin lactosa" ok={product.aptoSinLactosa} />
        <AptRow label="Apto vegano" ok={product.aptoVegano} />
      </div>

      <Section title="Ingredientes">
        <p className="text-sm text-[var(--color-text-muted)]">{product.ingredients.join(', ')}</p>
      </Section>

      <Section title="Alérgenos">
        {product.allergens.length > 0 ? (
          <ChipRow items={product.allergens} tone="risk" />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">Sin alérgenos declarados.</p>
        )}
      </Section>

      <Section title="Sellos">
        {product.seals.length > 0 ? (
          <ChipRow items={product.seals} tone="warn" />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">Sin sellos de advertencia.</p>
        )}
      </Section>

      <Section title="Por qué">
        <p className="text-sm leading-relaxed text-[var(--color-text)]">{product.explanation}</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ChipRow({ items, tone }: { items: string[]; tone: 'risk' | 'warn' }) {
  const cls =
    tone === 'risk'
      ? 'bg-[var(--color-risk-high-bg)] text-[var(--color-risk-high-text)]'
      : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]';
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span key={it} className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
          {it}
        </span>
      ))}
    </div>
  );
}
