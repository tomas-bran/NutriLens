/**
 * Open Food Facts enrichment logic (NL-601).
 *
 * Compares extracted product data against OFF data and returns:
 * - confirmed fields (matched between extraction + OFF)
 * - discrepancies (conflicts to surface as warnings in the UI)
 * - missing fields filled from OFF
 * - confidence delta
 */
import type { Alergeno, Categoria } from '@schemas/product';
import { ALERGENOS } from '@schemas/product';
import type { OFFProduct } from './client';

export interface OFFEnrichmentResult {
  matched: boolean;
  offProduct: OFFProduct | null;
  /** Fields confirmed by OFF (matched the extraction). */
  confirmedFields: string[];
  /** Discrepancies: extraction vs OFF differ noticeably. */
  discrepancies: Array<{ field: string; extracted: string; offValue: string }>;
  /** Allergens found in OFF that weren't in the extraction. */
  missingAllergens: Alergeno[];
  /** Confidence delta [-0.2, +0.2] to apply on top of model confidence. */
  confidenceDelta: number;
  /**
   * NL-601 (validación soft, no bloqueante): el usuario subió una imagen
   * dedicada del código de barras pero no se pudo decodificar (foto borrosa,
   * recorte, etc.). El análisis igual corre con la foto del producto.
   */
  barcodeUnreadable?: boolean;
  /**
   * NL-601 (validación soft): el código de barras decodificó y OFF tiene el
   * producto, pero su nombre no se corresponde con el de la foto → el código
   * podría ser de otro producto. NO bloquea; solo avisa en el resultado.
   */
  barcodeMismatch?: boolean;
}

/** Tag prefix used by OFF for allergens (e.g. "en:gluten"). */
const OFF_ALLERGEN_MAP: Record<string, Alergeno> = {
  gluten: 'gluten',
  milk: 'leche',
  lactose: 'leche',
  dairy: 'leche',
  egg: 'huevo',
  eggs: 'huevo',
  soy: 'soja',
  soybeans: 'soja',
  nuts: 'frutos secos',
  peanuts: 'maní',
  peanut: 'maní',
  fish: 'pescado',
  crustaceans: 'crustáceos',
  crustacean: 'crustáceos',
  sulphites: 'sulfitos',
  sulfites: 'sulfitos',
  sesame: 'sésamo',
};

/**
 * Parsea el `ingredients_text` de OFF en una lista de ingredientes (NL-601).
 * OFF marca alérgenos con guiones bajos (`_leche_`) — los sacamos. Best-effort:
 * separa por comas, recorta y descarta ruido.
 */
export function parseOffIngredients(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/_/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length <= 80)
    .slice(0, 50);
}

/** Stopwords que no aportan a la identidad de un producto. */
const NAME_STOPWORDS = new Set([
  'de',
  'la',
  'el',
  'los',
  'las',
  'con',
  'sin',
  'una',
  'del',
  'para',
  'sabor',
  'tipo',
]);

/** Tokens significativos de un nombre de producto (sin tildes, ≥3 chars, sin stopwords). */
function nameTokens(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t));
}

/**
 * ¿Los dos nombres de producto comparten al menos un token significativo?
 * Se usa para la validación soft barcode↔foto (NL-601): si el nombre que
 * devuelve OFF por el código de barras no se solapa con el que extrajo la IA
 * de la foto, el código probablemente es de otro producto. Cuando alguno de
 * los nombres no tiene tokens evaluables devolvemos `true` (no podemos juzgar
 * → no marcamos discrepancia).
 */
export function productNamesOverlap(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return true;
  const setB = new Set(tb);
  return ta.some((t) => setB.has(t));
}

/**
 * ¿El nombre extraído por la IA es genérico/inútil? (foto de un código de barras,
 * etiqueta ilegible, etc. → "otros"). En ese caso preferimos el nombre de OFF.
 */
export function isGenericProductName(name: string): boolean {
  const n = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  if (n.length < 3) return true;
  return [
    'otros',
    'otro',
    'producto',
    'desconocido',
    'sin nombre',
    'unknown',
    'n/a',
    'na',
  ].includes(n);
}

/**
 * Mapea los `categories_tags` de OFF (p.ej. "en:biscuits", "es:galletas") a una
 * `Categoria` de NutriLens. Best-effort por keywords; si no hay match claro
 * devuelve null (se conserva la categoría que tenía el producto, típicamente
 * "otros"). El orden define prioridad ante tags que matchean más de una.
 */
export function mapOffCategory(categoriesTags: string[]): Categoria | null {
  const hay = categoriesTags.map((t) => t.toLowerCase().replace(/^[a-z]{2}:/, '')).join(' ');
  if (!hay) return null;
  const rules: Array<[readonly string[], Categoria]> = [
    [
      ['beverage', 'drink', 'water', 'soda', 'juice', 'jugo', 'bebida', 'tea', 'coffee', 'cafe'],
      'bebidas',
    ],
    [
      [
        'dairy',
        'dairies',
        'milk',
        'leche',
        'yogur',
        'yoghurt',
        'cheese',
        'queso',
        'crema',
        'butter',
      ],
      'lácteos',
    ],
    [['biscuit', 'cookie', 'galleta', 'cracker'], 'galletitas'],
    [['cereal', 'granola', 'muesli', 'oat', 'avena', 'copos', 'corn-flake'], 'cereales'],
    [['snack', 'chip', 'crisp', 'papas', 'popcorn', 'pop-corn'], 'snacks'],
  ];
  for (const [keys, cat] of rules) {
    if (keys.some((k) => hay.includes(k))) return cat;
  }
  return null;
}

function extractAllergenFromTag(tag: string): Alergeno | null {
  // Tags look like "en:gluten" or "en:milk"
  const key = tag.replace(/^[a-z]{2}:/, '').toLowerCase();
  return OFF_ALLERGEN_MAP[key] ?? null;
}

function parseOffAllergens(tags: string[]): Alergeno[] {
  const result = new Set<Alergeno>();
  for (const tag of tags) {
    const a = extractAllergenFromTag(tag);
    if (a) result.add(a);
  }
  return [...result];
}

function isVeganFromLabels(labels: string[]): boolean {
  return labels.some((l) => l.includes('vegan'));
}

function isGlutenFreeFromLabels(labels: string[]): boolean {
  return labels.some((l) => l.includes('gluten-free') || l.includes('sin-gluten'));
}

export function buildEnrichment(
  extracted: {
    producto: string;
    alergenos: Alergeno[];
    apto_vegano: boolean;
    apto_celiaco: boolean;
  },
  offProduct: OFFProduct | null,
): OFFEnrichmentResult {
  if (!offProduct) {
    return {
      matched: false,
      offProduct: null,
      confirmedFields: [],
      discrepancies: [],
      missingAllergens: [],
      confidenceDelta: 0,
    };
  }

  const confirmedFields: string[] = [];
  const discrepancies: Array<{ field: string; extracted: string; offValue: string }> = [];
  let confidenceDelta = 0;

  // 1. Product name similarity (fuzzy — normalise case and whitespace)
  const normExtracted = extracted.producto.toLowerCase().replace(/\s+/g, ' ').trim();
  const normOff = offProduct.product_name.toLowerCase().replace(/\s+/g, ' ').trim();
  if (normOff && normExtracted.includes(normOff.slice(0, Math.max(4, normOff.length / 2)))) {
    confirmedFields.push('producto');
    confidenceDelta += 0.05;
  }

  // 2. Allergen comparison
  const offAllergens = parseOffAllergens(offProduct.allergens_tags);
  const extractedSet = new Set(extracted.alergenos);
  const offSet = new Set(offAllergens);

  // Allergens confirmed
  const sharedAllergens = extracted.alergenos.filter((a) => offSet.has(a));
  if (sharedAllergens.length > 0) {
    confirmedFields.push('alergenos');
    confidenceDelta += 0.05 * Math.min(sharedAllergens.length, 3);
  }

  // Allergens in OFF but not in extraction (potentially missed)
  const missingAllergens = (ALERGENOS as readonly Alergeno[]).filter(
    (a) => offSet.has(a) && !extractedSet.has(a),
  );
  if (missingAllergens.length > 0) {
    discrepancies.push({
      field: 'alergenos',
      extracted: extracted.alergenos.join(', ') || 'ninguno',
      offValue: offAllergens.join(', '),
    });
    confidenceDelta -= 0.1 * Math.min(missingAllergens.length, 2);
  }

  // 3. Vegan flag
  const offVegan = isVeganFromLabels(offProduct.labels_tags);
  if (offVegan !== undefined) {
    if (offVegan === extracted.apto_vegano) {
      confirmedFields.push('apto_vegano');
      confidenceDelta += 0.05;
    } else {
      discrepancies.push({
        field: 'apto_vegano',
        extracted: extracted.apto_vegano ? 'sí' : 'no',
        offValue: offVegan ? 'sí (según etiqueta OFF)' : 'no (según etiqueta OFF)',
      });
      confidenceDelta -= 0.05;
    }
  }

  // 4. Gluten-free flag
  const offGlutenFree = isGlutenFreeFromLabels(offProduct.labels_tags);
  if (offGlutenFree !== undefined) {
    if (offGlutenFree === extracted.apto_celiaco) {
      confirmedFields.push('apto_celiaco');
      confidenceDelta += 0.05;
    } else {
      discrepancies.push({
        field: 'apto_celiaco',
        extracted: extracted.apto_celiaco ? 'sí' : 'no',
        offValue: offGlutenFree ? 'sí (sin TACC según OFF)' : 'no (contiene gluten según OFF)',
      });
      confidenceDelta -= 0.05;
    }
  }

  // Clamp
  confidenceDelta = Math.max(-0.2, Math.min(0.2, confidenceDelta));

  return {
    matched: true,
    offProduct,
    confirmedFields,
    discrepancies,
    missingAllergens,
    confidenceDelta,
  };
}
