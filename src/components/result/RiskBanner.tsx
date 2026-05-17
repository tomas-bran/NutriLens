/**
 * Large risk callout. Pencil ref: `hgS9V` (rsRiskBig).
 * Token colors come from `--color-risk-*` / `--color-risk-*-bg` per spec
 * E03 §6.2.
 */
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { Riesgo } from '@schemas/product';
import type { ProductDetail } from '@/lib/products/serializers';

interface VariantStyles {
  className: string;
  label: string;
  icon: IconName;
}

const VARIANTS: Record<Riesgo, VariantStyles> = {
  bajo: {
    className: 'risk-banner-low',
    label: 'Riesgo bajo',
    icon: 'check',
  },
  medio: {
    className: 'risk-banner-medium',
    label: 'Riesgo medio',
    icon: 'triangle-alert',
  },
  alto: {
    className: 'risk-banner-high',
    label: 'Riesgo alto',
    icon: 'circle-alert',
  },
};

export function RiskBanner({ product }: { product: ProductDetail }) {
  const variant = VARIANTS[product.riesgo];
  const reasonLine = buildReasonLine(product);

  return (
    <section
      data-testid="risk-banner"
      data-risk={product.riesgo}
      className={cn(
        'flex items-center gap-4 rounded-[16px] p-5',
        'bg-[var(--risk-banner-bg)] text-[var(--risk-banner-fg)]',
        variant.className,
      )}
    >
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--risk-banner-fg)] text-white">
        <Icon name={variant.icon} className="h-6 w-6" strokeWidth={2.5} />
      </span>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[18px] font-bold leading-tight">{variant.label}</h2>
        {reasonLine && <p className="text-[13px] leading-snug">{reasonLine}</p>}
      </div>
    </section>
  );
}

function buildReasonLine(product: ProductDetail): string | null {
  const parts: string[] = [];
  if (product.alergenos.length > 0) {
    parts.push(`alérgenos: ${product.alergenos.join(', ')}`);
  }
  if (product.sellos.length > 0) {
    parts.push(`${product.sellos.length} ${product.sellos.length === 1 ? 'sello' : 'sellos'}`);
  }
  if (parts.length === 0) return null;
  return `Por ${parts.join(' y ')}.`;
}
