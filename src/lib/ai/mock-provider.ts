/**
 * MockIaProvider — used in dev and CI so we never consume Azure credit.
 * Returns fixed responses derived from fixtures.
 * See `docs/specs/E02 §8` y `E05 §8` (chat).
 */
import type {
  AnalyzeOpts,
  AnswerOpts,
  ExplainOpts,
  IaCallResult,
  IaProvider,
  ParseIntentOpts,
  SavedProductLite,
} from './types';
import type { ProductExtraction } from '@schemas/product';

const FIXED_EXTRACTION: ProductExtraction = {
  producto: 'Mock Product',
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
  async analyzeLabel(_file: Buffer, _mime: string, _opts: AnalyzeOpts): Promise<IaCallResult> {
    return {
      raw: JSON.stringify(FIXED_EXTRACTION),
      usage: { in: 0, out: 0 },
      latencyMs: 5,
    };
  }

  async classifyLabelKind(_file: Buffer, _mime: string, _opts: AnalyzeOpts): Promise<IaCallResult> {
    return {
      raw: JSON.stringify({ is_food_label: true, confidence: 0.95 }),
      usage: { in: 0, out: 0 },
      latencyMs: 3,
    };
  }

  async generateExplanation(product: ProductExtraction, _opts: ExplainOpts): Promise<IaCallResult> {
    // User-facing string kept in Spanish on purpose: it's the product output.
    // Includes the disclaimer marker so sanitizeExplanation is idempotent on mock output.
    const restricciones = [
      product.alergenos.length > 0 ? `alérgenos: ${product.alergenos.join(', ')}` : null,
      product.sellos.length > 0 ? `sellos: ${product.sellos.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('; ');
    const body = restricciones
      ? `${product.producto} (${product.categoria}) — riesgo ${product.riesgo}. ${restricciones}.`
      : `${product.producto} (${product.categoria}) — sin restricciones detectadas, riesgo ${product.riesgo}.`;
    return {
      raw: `${body} Recordá que NutriLens es un asistente informativo.`,
      usage: { in: 0, out: 0 },
      latencyMs: 3,
    };
  }

  /**
   * Parser heurístico — suficiente para los E2E y tests del MVP sin gastar
   * tokens. Reconoce los disparadores documentados en el prompt
   * `chat_parse_intent-v1`. Si nada matchea, devuelve `unknown` para que el
   * pipeline atajee con la respuesta de fallback (US-30 escenario unknown).
   */
  async parseIntent(question: string, _opts: ParseIntentOpts): Promise<IaCallResult> {
    return {
      raw: JSON.stringify(heuristicIntent(question)),
      usage: { in: 0, out: 0 },
      latencyMs: 2,
    };
  }

  async answerWithContext(
    _question: string,
    products: SavedProductLite[],
    _opts: AnswerOpts,
  ): Promise<IaCallResult> {
    const names = products.map((p) => p.nombre).join(', ') || 'ninguno';
    // User-facing string kept in Spanish on purpose: it's the product output.
    return {
      raw: `Mock answer sobre productos: ${names}. Basado en productos analizados por vos. NutriLens es un asistente informativo.`,
      usage: { in: 0, out: 0 },
      latencyMs: 3,
    };
  }
}

type MockIntentShape = {
  kind: 'filter' | 'compare' | 'info' | 'unknown';
  categoria:
    | 'galletitas'
    | 'cereales'
    | 'snacks'
    | 'lácteos'
    | 'bebidas'
    | 'sin TACC'
    | 'veganos'
    | 'otros'
    | null;
  riesgo_max: 'bajo' | 'medio' | 'alto' | null;
  apto: 'vegano' | 'celiaco' | 'sin_lactosa' | null;
  alergeno_excluido: string | null;
  keywords: string[];
  comparar: string[];
};

/**
 * Heurística regex-based para emular el parser de Phi en mock. Exportada para
 * que los tests de retrieval puedan construir intents sin depender del schema.
 */
export function heuristicIntent(question: string): MockIntentShape {
  const q = question.toLowerCase();

  // Compare antes que nada — captura "comparame X con Y".
  const compareMatch = /compar[áa]?me?\s+(.+?)\s+(?:con|y|vs\.?|versus)\s+(.+)$/i.exec(
    question.trim(),
  );
  if (compareMatch) {
    return {
      kind: 'compare',
      categoria: null,
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: [],
      comparar: [compareMatch[1]!.trim(), compareMatch[2]!.trim()],
    };
  }

  let categoria: MockIntentShape['categoria'] = null;
  if (/galletitas?/.test(q)) categoria = 'galletitas';
  else if (/cereales?/.test(q)) categoria = 'cereales';
  else if (/snacks?/.test(q)) categoria = 'snacks';
  else if (/l[áa]cteos?/.test(q)) categoria = 'lácteos';
  else if (/bebidas?/.test(q)) categoria = 'bebidas';
  else if (/sin\s+tacc/.test(q)) categoria = 'sin TACC';
  else if (/veganos?/.test(q)) categoria = 'veganos';

  let apto: MockIntentShape['apto'] = null;
  if (/cel[íi]ac[oa]s?/.test(q) || /sin\s+gluten/.test(q)) apto = 'celiaco';
  else if (/sin\s+lactosa/.test(q)) apto = 'sin_lactosa';
  else if (/veganos?/.test(q)) apto = 'vegano';

  let alergenoExcluido: string | null = null;
  const sinMatch = /sin\s+([a-záéíóúñ]+)/i.exec(q);
  if (sinMatch) {
    const term = sinMatch[1]!;
    // "sin gluten" / "sin lactosa" / "sin tacc" ya se mapean a apto, no como exclusión doble.
    if (!['gluten', 'lactosa', 'tacc'].includes(term)) {
      alergenoExcluido = term;
    }
  }

  let riesgoMax: MockIntentShape['riesgo_max'] = null;
  if (/(mejor|m[aá]s\s+san[oa]|menor\s+riesgo|mejor\s+perfil)/.test(q)) {
    riesgoMax = 'bajo';
  }

  const isInfo = /^(qu[ée]|cu[áa]les|tengo)/.test(q.trim());
  // Detecta intentos claros de chat fuera de scope.
  const offTopic =
    /(chiste|clima|chist[eo]s|del tiempo|hist[óo]rico|qui[ée]n eres|cu[áa]ntos a[ñn]os ten[ée]s)/.test(
      q,
    );
  if (offTopic) {
    return {
      kind: 'unknown',
      categoria: null,
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    };
  }

  // Si no pudimos extraer nada útil, fallback a unknown.
  if (!categoria && !apto && !alergenoExcluido && !riesgoMax) {
    // Permitimos info con keywords libres ("qué productos tengo con leche").
    const keywordsMatch = /con\s+([a-záéíóúñ]+)/i.exec(q);
    if (keywordsMatch) {
      return {
        kind: 'info',
        categoria: null,
        riesgo_max: null,
        apto: null,
        alergeno_excluido: null,
        keywords: [keywordsMatch[1]!],
        comparar: [],
      };
    }
    return {
      kind: 'unknown',
      categoria: null,
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    };
  }

  return {
    kind: isInfo ? 'info' : 'filter',
    categoria,
    riesgo_max: riesgoMax,
    apto,
    alergeno_excluido: alergenoExcluido,
    keywords: [],
    comparar: [],
  };
}
