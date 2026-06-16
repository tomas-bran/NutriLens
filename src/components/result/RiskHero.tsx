/**
 * <RiskHero> (rediseño Claude Design) — "hero" del riesgo: una tarjeta tintada
 * con el medidor semicircular (<RiskGauge>), la etiqueta del nivel y la razón.
 * Reemplaza al banner plano (`RiskBanner`) en la vista de resultado.
 */
import type { Riesgo } from '@schemas/product';
import type { ProductDetail } from '@/lib/products/serializers';
import { RiskGauge } from './RiskGauge';

const META: Record<Riesgo, { label: string; bg: string; fg: string; ring: string }> = {
  bajo: { label: 'Riesgo bajo', bg: '#dcfce7', fg: '#15803d', ring: '#16a34a' },
  medio: { label: 'Riesgo medio', bg: '#fef3c7', fg: '#b45309', ring: '#f59e0b' },
  alto: { label: 'Riesgo alto', bg: '#fee2e2', fg: '#b91c1c', ring: '#ef4444' },
};

export function RiskHero({ product }: { product: ProductDetail }) {
  const meta = META[product.riesgo];
  const reason = buildReasonLine(product);

  return (
    <section
      data-testid="risk-banner"
      data-risk={product.riesgo}
      className="home-rise-in rounded-[22px] px-4 pb-4 pt-[18px] text-center"
      style={{ background: meta.bg, border: `1px solid ${meta.ring}33` }}
    >
      <RiskGauge risk={product.riesgo} />
      <h2 className="mt-0.5 text-[21px] font-extrabold" style={{ color: meta.fg }}>
        {meta.label}
      </h2>
      <p className="mt-[3px] text-[13px] font-medium opacity-80" style={{ color: meta.fg }}>
        {reason}
      </p>
    </section>
  );
}

function buildReasonLine(product: ProductDetail): string {
  const parts: string[] = [];
  if (product.alergenos.length > 0) parts.push(`alérgenos: ${product.alergenos.join(', ')}`);
  if (product.sellos.length > 0) {
    parts.push(`${product.sellos.length} ${product.sellos.length === 1 ? 'sello' : 'sellos'}`);
  }
  return parts.length ? `Por ${parts.join(' y ')}.` : 'Sin advertencias detectadas.';
}
