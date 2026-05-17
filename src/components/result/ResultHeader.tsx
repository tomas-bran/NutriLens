import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { ProductDetail } from '@/lib/products/serializers';

export interface ResultHeaderBackAction {
  href: string;
  label: string;
}

const DEFAULT_BACK: ResultHeaderBackAction = {
  href: '/analizar',
  label: 'Volver al upload',
};

interface ResultHeaderProps {
  product: ProductDetail;
  back?: ResultHeaderBackAction;
  /** Optional eyebrow above the category (e.g. "Producto guardado"). */
  contextLabel?: string;
}

export function ResultHeader({ product, back, contextLabel }: ResultHeaderProps) {
  const backAction = back ?? DEFAULT_BACK;
  return (
    <header className="flex items-start gap-3" data-testid="result-header">
      <Link
        href={backAction.href}
        aria-label={backAction.label}
        data-testid="result-back"
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
      >
        <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
      </Link>

      <div className="flex flex-col gap-0.5">
        {contextLabel && (
          <p
            className="text-[10px] font-bold uppercase tracking-[2px] text-[var(--color-text-muted)]"
            data-testid="result-context"
          >
            {contextLabel}
          </p>
        )}
        <p
          className="text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--color-primary-strong)]"
          data-testid="result-category"
        >
          {product.categoria}
        </p>
        <h1
          className="text-[22px] font-bold leading-tight text-[var(--color-text)] md:text-[26px]"
          data-testid="result-title"
        >
          {product.nombre}
        </h1>
        <p className="text-[12px] text-[var(--color-text-muted)]">
          Confianza {(product.confidence * 100).toFixed(0)}% · {formatDate(product.createdAt)}
        </p>
      </div>
    </header>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}
