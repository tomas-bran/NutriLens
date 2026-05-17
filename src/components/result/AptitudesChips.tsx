/**
 * Three aptitude chips: vegano / celíaco / sin lactosa.
 * Each shows ✓ Apto / ✗ No apto with token-driven colors.
 */
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { ProductDetail } from '@/lib/products/serializers';

export function AptitudesChips({ product }: { product: ProductDetail }) {
  return (
    <section aria-labelledby="aptitudes-title" className="flex flex-col gap-2">
      <h2 id="aptitudes-title" className="sr-only">
        Aptitudes
      </h2>
      <div
        className="flex flex-wrap gap-2"
        data-testid="aptitudes-chips"
        role="list"
        aria-label="Aptitudes del producto"
      >
        <AptitudeChip kind="vegano" apto={product.aptoVegano} />
        <AptitudeChip kind="celiaco" apto={product.aptoCeliaco} />
        <AptitudeChip kind="sin_lactosa" apto={product.aptoSinLactosa} />
      </div>
    </section>
  );
}

type AptitudeKind = 'vegano' | 'celiaco' | 'sin_lactosa';

const APTITUDE_LABEL: Record<AptitudeKind, { apto: string; noApto: string }> = {
  vegano: { apto: 'Vegano', noApto: 'No vegano' },
  celiaco: { apto: 'Apto celíaco', noApto: 'No apto celíaco' },
  sin_lactosa: { apto: 'Sin lactosa', noApto: 'Tiene lactosa' },
};

function AptitudeChip({ kind, apto }: { kind: AptitudeKind; apto: boolean }) {
  const label = apto ? APTITUDE_LABEL[kind].apto : APTITUDE_LABEL[kind].noApto;
  return (
    <span
      role="listitem"
      data-testid={`aptitude-${kind}`}
      data-apto={apto ? 'true' : 'false'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-bold',
        apto
          ? 'border-[var(--color-success-bg)] bg-[var(--color-success-bg)] text-[var(--color-primary-strong)]'
          : 'border-[var(--color-danger-bg)] bg-[var(--color-danger-bg)] text-[var(--color-risk-high)]',
      )}
    >
      <Icon name={apto ? 'check' : 'close'} className="h-3.5 w-3.5" strokeWidth={2.5} />
      {label}
    </span>
  );
}
