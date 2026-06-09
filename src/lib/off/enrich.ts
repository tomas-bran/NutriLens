/**
 * Open Food Facts enrichment logic (NL-601).
 *
 * Compares extracted product data against OFF data and returns:
 * - confirmed fields (matched between extraction + OFF)
 * - discrepancies (conflicts to surface as warnings in the UI)
 * - missing fields filled from OFF
 * - confidence delta
 */
import type { Alergeno } from '@schemas/product';
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
  extracted: { producto: string; alergenos: Alergeno[]; apto_vegano: boolean; apto_celiaco: boolean },
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
