/**
 * <ProductChip> — card compacta del producto referenciado en una respuesta
 * del asistente (US-32 §1+§2). Click navega al detalle del producto.
 *
 * Visual: Pencil M12 (cards numeradas en la respuesta del bot) y D05 (panel
 * lateral "FUENTES USADAS"). Rendereamos la misma card en mobile y desktop
 * para mantener una sola fuente de verdad — el spec §9.2 solo pide "chip
 * clickeable con nombre + riesgo".
 *
 * Accesibilidad: el wrapper es un <Link> con `aria-label` armado con
 * nombre + riesgo, para que un lector de pantalla anuncie ambas piezas.
 */
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import type { ChatProductRef } from '@/lib/chat/response';

interface ProductChipProps {
  product: ChatProductRef;
  /** Cuando se renderea dentro de una lista numerada (M12). */
  rank?: number;
}

const RISK_VARIANT = {
  bajo: 'risk-low',
  medio: 'risk-medium',
  alto: 'risk-high',
} as const;

const RISK_LABEL = {
  bajo: 'Riesgo bajo',
  medio: 'Riesgo medio',
  alto: 'Riesgo alto',
} as const;

export function ProductChip({ product, rank }: ProductChipProps) {
  const variant = RISK_VARIANT[product.riesgo];
  return (
    <Link
      href={`/historial/${product.id}`}
      data-testid="chat-product-chip"
      aria-label={`${product.nombre} — ${RISK_LABEL[product.riesgo]}. Ver detalle del producto.`}
      className="group flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-3 py-3 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
    >
      {typeof rank === 'number' && (
        <span
          aria-hidden="true"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-bg)] text-xs font-bold text-[var(--color-text-muted)]"
        >
          #{rank}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-[var(--color-text)]">
          {product.nombre}
        </span>
        <Badge variant={variant}>{RISK_LABEL[product.riesgo]}</Badge>
      </div>
      <Icon
        name="arrow-right"
        className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]"
        aria-hidden="true"
      />
    </Link>
  );
}
