/**
 * MockIaProvider — usado en dev y CI para no consumir crédito de Azure.
 * Devuelve respuestas fijas a partir de fixtures.
 * Ver `docs/specs/E02 §8`.
 */
import type {
  AnalyzeOpts,
  AnswerOpts,
  ExplainOpts,
  IaCallResult,
  IaProvider,
  SavedProductLite,
} from './types';
import type { ProductExtraction } from '@schemas/product';

const FIXED_EXTRACTION: ProductExtraction = {
  producto: 'Producto Mock',
  categoria: 'otros',
  ingredientes_detectados: [],
  alergenos: [],
  sellos: [],
  apto_vegano: true,
  apto_celiaco: true,
  apto_sin_lactosa: true,
  riesgo: 'bajo',
  confidence: 0.9,
};

export class MockIaProvider implements IaProvider {
  async analyzeLabel(
    _file: Buffer,
    _mime: string,
    _opts: AnalyzeOpts,
  ): Promise<IaCallResult> {
    return {
      raw: JSON.stringify(FIXED_EXTRACTION),
      usage: { in: 0, out: 0 },
      latencyMs: 5,
    };
  }

  async classifyLabelKind(
    _file: Buffer,
    _mime: string,
    _opts: AnalyzeOpts,
  ): Promise<IaCallResult> {
    return {
      raw: JSON.stringify({ is_food_label: true, confidence: 0.95 }),
      usage: { in: 0, out: 0 },
      latencyMs: 3,
    };
  }

  async generateExplanation(
    _product: ProductExtraction,
    _opts: ExplainOpts,
  ): Promise<IaCallResult> {
    return {
      raw: 'Explicación mock. NutriLens es un asistente informativo.',
      usage: { in: 0, out: 0 },
      latencyMs: 3,
    };
  }

  async answerWithContext(
    _question: string,
    products: SavedProductLite[],
    _opts: AnswerOpts,
  ): Promise<IaCallResult> {
    const names = products.map((p) => p.nombre).join(', ') || 'ninguno';
    return {
      raw: `Mock answer sobre productos: ${names}. NutriLens es un asistente informativo.`,
      usage: { in: 0, out: 0 },
      latencyMs: 3,
    };
  }
}
