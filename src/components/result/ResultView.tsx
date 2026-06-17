/**
 * <ResultView> — analysis result screen layout.
 *
 * Spec: `docs/specs/E03-clasificacion-reglas-explicacion.md §6.1` for the
 * post-analysis variant and `E04 §6.5` for the catálogo detail variant
 * (same body, different back target + context label).
 *
 * Pure presentational — the owning Server Component fetches the
 * `ProductDetail` from Prisma and passes it in.
 */
import { AllergenList } from './AllergenList';
import { AptitudeRows } from './AptitudeRows';
import { ExplanationCard } from './ExplanationCard';
import { IngredientList } from './IngredientList';
import { JsonViewer } from './JsonViewer';
import { LowConfidenceBanner } from './LowConfidenceBanner';
import { OFFBadge } from './OFFBadge';
import { PipelineTrace } from './PipelineTrace';
import { ProductImageCard } from './ProductImageCard';
import { ResultHeader, type ResultHeaderBackAction } from './ResultHeader';
import { RiskHero } from './RiskHero';
import { SelloChips } from './SelloChips';
import { Disclaimer } from '@/components/ui/Disclaimer';
import type { ProductDetail } from '@/lib/products/serializers';

export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export interface ResultViewProps {
  product: ProductDetail;
  /**
   * Back button target. Defaults to `/analizar` (post-analysis flow); set to
   * `/catalogo` with the matching label for the catálogo detail variant.
   */
  back?: ResultHeaderBackAction;
  /**
   * Optional eyebrow shown above the category (e.g. "Producto guardado"
   * on the catálogo detail page).
   */
  contextLabel?: string;
  /**
   * NL-204: las vistas técnicas (JSON crudo + pipeline trace) son solo para
   * admins — el usuario común ve la interfaz limpia. Las páginas resuelven
   * `isCurrentUserAdmin()` y lo pasan acá. Default `false` (UI de usuario).
   */
  showTechnicalViews?: boolean;
}

export function ResultView({
  product,
  back,
  contextLabel,
  showTechnicalViews = false,
}: ResultViewProps) {
  const showLowConfidence = product.confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <div className="flex flex-col gap-6 px-4 py-2 md:px-6 md:py-6" data-testid="result-view">
      <ResultHeader product={product} back={back} contextLabel={contextLabel} />

      {showLowConfidence && <LowConfidenceBanner />}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.6fr] md:items-start">
        <div className="flex flex-col gap-5">
          <ProductImageCard product={product} />
          <RiskHero product={product} />
          {/* Alérgenos y sellos en dos filas separadas (cada una a lo ancho de
              la columna); los chips de alérgenos fluyen uno al lado del otro. */}
          <AllergenList allergens={product.alergenos} />
          <SelloChips sellos={product.sellos} />
        </div>

        <div className="flex flex-col gap-5">
          <AptitudeRows product={product} />
          <ExplanationCard explanation={product.explanation} />
          <IngredientList ingredients={product.ingredientes} />
        </div>
      </div>

      {/*
       * E06 §4 (US-34) + §3 (US-33): JSON crudo + pipeline trace, ambos
       * colapsables. NL-204: solo visibles para admins (el usuario común no ve
       * detalles de implementación). Bajo un encabezado de "Vista técnica".
       */}
      {showTechnicalViews && (
        <section className="flex flex-col gap-4" data-testid="admin-technical-views">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--color-text-muted)]">
            <span className="inline-flex h-4 items-center rounded bg-[var(--color-surface)] px-1.5 text-[10px] text-[var(--color-text-muted)]">
              admin
            </span>
            Vista técnica
          </p>
          <JsonViewer raw={product.jsonRaw} />
          <PipelineTrace trace={product.pipelineTrace} />
        </section>
      )}

      <footer className="mt-2 flex flex-col gap-4">
        {product.offEnrichment?.matched && <OFFBadge enrichment={product.offEnrichment} />}
        <Disclaimer />
      </footer>
    </div>
  );
}
