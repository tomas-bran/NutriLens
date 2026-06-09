/**
 * <ResultView> — analysis result screen layout.
 *
 * Spec: `docs/specs/E03-clasificacion-reglas-explicacion.md §6.1` for the
 * post-analysis variant and `E04 §6.5` for the historial detail variant
 * (same body, different back target + context label).
 *
 * Pure presentational — the owning Server Component fetches the
 * `ProductDetail` from Prisma and passes it in.
 */
import { AllergenList } from './AllergenList';
import { AptitudesChips } from './AptitudesChips';
import { ExplanationCard } from './ExplanationCard';
import { IngredientList } from './IngredientList';
import { JsonViewer } from './JsonViewer';
import { LowConfidenceBanner } from './LowConfidenceBanner';
import { OFFBadge } from './OFFBadge';
import { PipelineTrace } from './PipelineTrace';
import { ProductImageCard } from './ProductImageCard';
import { ResultHeader, type ResultHeaderBackAction } from './ResultHeader';
import { RiskBanner } from './RiskBanner';
import { SelloChips } from './SelloChips';
import { Disclaimer } from '@/components/ui/Disclaimer';
import type { ProductDetail } from '@/lib/products/serializers';

export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export interface ResultViewProps {
  product: ProductDetail;
  /**
   * Back button target. Defaults to `/analizar` (post-analysis flow); set to
   * `/historial` with the matching label for the historial detail variant.
   */
  back?: ResultHeaderBackAction;
  /**
   * Optional eyebrow shown above the category (e.g. "Producto guardado"
   * on the historial detail page).
   */
  contextLabel?: string;
}

export function ResultView({ product, back, contextLabel }: ResultViewProps) {
  const showLowConfidence = product.confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <div className="flex flex-col gap-6 px-4 py-2 md:px-6 md:py-6" data-testid="result-view">
      <ResultHeader product={product} back={back} contextLabel={contextLabel} />

      {showLowConfidence && <LowConfidenceBanner />}

      {product.offEnrichment?.matched && (
        <OFFBadge enrichment={product.offEnrichment} />
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.6fr]">
        <ProductImageCard product={product} />

        <div className="flex flex-col gap-5">
          <RiskBanner product={product} />
          <AptitudesChips product={product} />
          <ExplanationCard explanation={product.explanation} />
          <AllergenList allergens={product.alergenos} />
          <SelloChips sellos={product.sellos} />
          <IngredientList ingredients={product.ingredientes} />
        </div>
      </div>

      {/*
       * E06 §4 (US-34) + §3 (US-33): JSON crudo + pipeline trace, ambos
       * colapsables. El JSON arriba porque el orden del spec §4 lo pone
       * primero ("debajo de JSON extraído" para PipelineTrace, §3.1).
       */}
      <JsonViewer raw={product.jsonRaw} />
      <PipelineTrace trace={product.pipelineTrace} />

      <footer className="mt-2 flex flex-col gap-4">
        <Disclaimer />
      </footer>
    </div>
  );
}
