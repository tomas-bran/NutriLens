'use client';

/**
 * <OFFBadge> — badge "Verificado con Open Food Facts" (NL-601).
 * Shows confirmed fields, discrepancies, and ODbL attribution.
 */
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { OFFEnrichmentResult } from '@/lib/off/enrich';

interface OFFBadgeProps {
  enrichment: OFFEnrichmentResult;
}

export function OFFBadge({ enrichment }: OFFBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (!enrichment.matched || !enrichment.offProduct) return null;

  const hasDiscrepancies = enrichment.discrepancies.length > 0;
  const hasMissingAllergens = enrichment.missingAllergens.length > 0;
  const showWarning = hasDiscrepancies || hasMissingAllergens;

  return (
    <div
      data-testid="off-badge"
      className="rounded-xl border border-[#26A69A]/30 bg-[#E0F2F1] px-4 py-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            🌿
          </span>
          <div>
            <p className="text-sm font-semibold text-[#00695C]">Verificado con Open Food Facts</p>
            {enrichment.confirmedFields.length > 0 && (
              <p className="text-xs text-[#00695C]/80">
                Confirmado: {enrichment.confirmedFields.join(', ')}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 rounded-lg p-1 text-[#00695C] transition-colors hover:bg-[#00695C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26A69A]"
          aria-expanded={expanded}
          aria-label={expanded ? 'Ocultar detalles' : 'Ver detalles'}
        >
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            className="h-4 w-4"
            aria-hidden="true"
          />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-2">
          {showWarning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="mb-1 text-xs font-semibold text-amber-800">
                ⚠️ Discrepancias encontradas
              </p>
              {enrichment.discrepancies.map((d) => (
                <p key={d.field} className="text-xs text-amber-700">
                  <span className="font-medium">{d.field}</span>: extraído &quot;{d.extracted}&quot;
                  — OFF dice &quot;{d.offValue}&quot;
                </p>
              ))}
              {hasMissingAllergens && (
                <p className="mt-1 text-xs text-amber-700">
                  Alérgenos en OFF no detectados:{' '}
                  <span className="font-medium">{enrichment.missingAllergens.join(', ')}</span>
                </p>
              )}
            </div>
          )}

          <a
            href={enrichment.offProduct.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#00695C] underline hover:text-[#004D40]"
          >
            Ver en Open Food Facts
            <Icon name="external-link" className="h-3 w-3" aria-hidden="true" />
          </a>
          <p className="text-[10px] text-[#00695C]/60">
            Datos de{' '}
            <a
              href="https://openfoodfacts.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
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
        </div>
      )}
    </div>
  );
}
