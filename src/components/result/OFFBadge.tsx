/**
 * <OFFBadge> — atribución de Open Food Facts (NL-601).
 *
 * Desde el rediseño de enrichment, OFF es una fuente autoritativa que se
 * MERGEA al producto antes del informe de la IA (no un cross-check). Por eso
 * acá ya no mostramos un banner de "verificado/discrepancias": queda solo una
 * nota chica de atribución (obligatoria por la licencia ODbL) con el link al
 * producto en OFF.
 */
import type { OFFEnrichmentResult } from '@/lib/off/enrich';

interface OFFBadgeProps {
  enrichment: OFFEnrichmentResult;
}

export function OFFBadge({ enrichment }: OFFBadgeProps) {
  if (!enrichment.matched || !enrichment.offProduct) return null;

  return (
    <p
      data-testid="off-badge"
      className="flex flex-wrap items-center gap-1 text-[11px] text-[var(--color-text-muted)]"
    >
      <span aria-hidden="true">🌿</span>
      Datos completados con{' '}
      <a
        href={enrichment.offProduct.url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-[var(--color-text)]"
      >
        Open Food Facts
      </a>{' '}
      — licencia{' '}
      <a
        href="https://opendatacommons.org/licenses/odbl/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        ODbL
      </a>
    </p>
  );
}
