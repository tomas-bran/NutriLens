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
  EmbedOpts,
  EmbedResult,
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
    opts: AnswerOpts,
  ): Promise<IaCallResult> {
    // NL-503: pills de seguimiento contextuales — el mock devuelve un set
    // canned válido para que unit/E2E verifiquen el flujo sin LLM real.
    if (opts.promptVersion === 'chat_suggestions-v1') {
      return {
        raw: '["¿Cuál tiene menos azúcar?", "Compará los dos primeros", "¿Alguno apto celíacos?"]',
        usage: { in: 0, out: 0 },
        latencyMs: 2,
      };
    }
    // US-31: cuando el caller pide `chat_answer-v2` (o pasa intent_kind=compare
    // en opts.extra), emulamos la tabla markdown que produciría el LLM real
    // para que los E2E del compare puedan verificar el render de la tabla
    // sin tocar Foundry. El formato es el documentado en el prompt v2.
    const isCompareTemplate =
      opts.promptVersion === 'chat_answer-v2' || opts.extra?.intent_kind === 'compare';
    if (isCompareTemplate && products.length >= 2) {
      return {
        raw: buildMockCompareAnswer(products),
        usage: { in: 0, out: 0 },
        latencyMs: 4,
      };
    }
    const names = products.map((p) => p.nombre).join(', ') || 'ninguno';
    // User-facing string kept in Spanish on purpose: it's the product output.
    return {
      raw: `Mock answer sobre productos: ${names}. Basado en productos analizados por vos. NutriLens es un asistente informativo.`,
      usage: { in: 0, out: 0 },
      latencyMs: 3,
    };
  }

  // NL-401: embedding determinístico (xorshift seedeado por hash del texto),
  // normalizado a norma 1. No captura semántica — garantiza reproducibilidad
  // en tests/CI sin red: mismo texto => mismo vector.
  async embed(text: string, _opts: EmbedOpts = {}): Promise<EmbedResult> {
    return {
      vector: pseudoEmbedding(text, 1536),
      usage: { in: 0, out: 0 },
      latencyMs: 1,
    };
  }
}

function pseudoEmbedding(text: string, dims: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let x = h >>> 0 || 1;
  const v = new Array<number>(dims);
  let normSq = 0;
  for (let i = 0; i < dims; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    const val = (x >>> 0) / 0xffffffff - 0.5;
    v[i] = val;
    normSq += val * val;
  }
  const norm = Math.sqrt(normSq) || 1;
  for (let i = 0; i < dims; i++) v[i] = v[i]! / norm;
  return v;
}

/**
 * Construye una tabla markdown canned con las dimensiones que el spec v2 pide
 * (Riesgo / Alérgenos / Sellos). Usado solo en MockIaProvider para que los
 * E2E del compare tengan algo que renderizar sin gastar tokens.
 */
function buildMockCompareAnswer(products: SavedProductLite[]): string {
  const cols = products.slice(0, 2);
  const a = cols[0]!;
  const b = cols[1]!;
  const fmt = (xs: string[]) => (xs.length === 0 ? 'ninguno' : xs.join(', '));
  return [
    `Acá comparamos ${a.nombre} y ${b.nombre}:`,
    '',
    `| Dimensión | ${a.nombre} | ${b.nombre} |`,
    `| --------- | --------- | --------- |`,
    `| Riesgo    | ${a.riesgo} | ${b.riesgo} |`,
    `| Alérgenos | ${fmt(a.alergenos)} | ${fmt(b.alergenos)} |`,
    `| Sellos    | ${fmt(a.sellos)} | ${fmt(b.sellos)} |`,
    '',
    `Te recomiendo ${a.nombre} (mock).`,
    '',
    'Basado en productos analizados por vos. NutriLens es un asistente informativo.',
  ].join('\n');
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

  // Compare antes que nada. Soportamos varias formas en castellano:
  //   "comparame X con Y" / "comparame X vs Y"
  //   "compará X con Y"
  //   "comparar X y Y"
  //   "X vs Y"  (cuando es lo único que el usuario escribe)
  //   "qué es mejor, X o Y"
  const trimmed = question.trim();
  const comparePatterns: RegExp[] = [
    /^compar[áa]?(?:me)?\s+(.+?)\s+(?:con|vs\.?|versus|y)\s+(.+?)\s*\??$/i,
    /^comparar\s+(.+?)\s+(?:con|vs\.?|versus|y)\s+(.+?)\s*\??$/i,
    /^qu[ée]\s+es\s+mejor[,\s]+(.+?)\s+o\s+(.+?)\s*\??$/i,
    /^(.+?)\s+vs\.?\s+(.+?)\s*\??$/i,
  ];
  for (const pat of comparePatterns) {
    const m = pat.exec(trimmed);
    if (m) {
      const left = m[1]!.trim();
      const right = m[2]!.trim();
      // Guard: descartamos matches degenerados donde la primer mitad es muy
      // corta (ej. "vs" agarrando "tengo vs nada"). El usuario que pide compare
      // siempre escribe nombres de ≥3 chars.
      if (left.length < 3 || right.length < 3) continue;
      return {
        kind: 'compare',
        categoria: null,
        riesgo_max: null,
        apto: null,
        alergeno_excluido: null,
        keywords: [],
        comparar: [left, right],
      };
    }
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
