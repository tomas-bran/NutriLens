/**
 * <ResultView> — analysis result screen layout.
 *
 * Spec: `docs/specs/E03-clasificacion-reglas-explicacion.md §6.1`.
 * Pencil reference: `M05-Resultado` (mobile) + `D03-Resultado` (desktop).
 *
 * Pure presentational — the owning Server Component fetches the
 * `ProductDetail` from Prisma and passes it in. Render order matches the
 * §6.1 layout: image header → low confidence banner (if <0.6) → risk →
 * aptitudes → explanation → allergens → sellos → ingredients → disclaimer.
 *
 * JSON viewer (US-34) and pipeline trace (US-33) are explicit out-of-scope
 * placeholders rendered at the bottom.
 */
import { AllergenList } from './AllergenList';
import { AptitudesChips } from './AptitudesChips';
import { ExplanationCard } from './ExplanationCard';
import { IngredientList } from './IngredientList';
import { LowConfidenceBanner } from './LowConfidenceBanner';
import { ProductImageCard } from './ProductImageCard';
import { ResultHeader } from './ResultHeader';
import { RiskBanner } from './RiskBanner';
import { SelloChips } from './SelloChips';
import { Disclaimer } from '@/components/ui/Disclaimer';
import type { ProductDetail } from '@/lib/products/serializers';

export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export interface ResultViewProps {
  product: ProductDetail;
}

export function ResultView({ product }: ResultViewProps) {
  const showLowConfidence = product.confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <div className="flex flex-col gap-6 px-4 py-2 md:px-6 md:py-6" data-testid="result-view">
      <ResultHeader product={product} />

      {showLowConfidence && <LowConfidenceBanner />}

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

      <footer className="mt-2 flex flex-col gap-4">
        <Disclaimer />
      </footer>
    </div>
  );
}
