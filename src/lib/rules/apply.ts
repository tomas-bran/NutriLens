/**
 * `apply_rules` — pure function that derives aptitude flags from a
 * ProductExtraction by matching ingredients/allergens against our own
 * blacklists. Spec E03 §3.
 *
 * Conservative by default: when in doubt, mark NOT apto. False negatives
 * are cheap (the user double-checks); false positives are dangerous
 * (the user trusts and consumes something they can't).
 */
import type { ProductExtraction } from '@schemas/product';
import { NO_CELIAC, NO_LACTOSE, NO_VEGAN } from './blacklists';
import { normalize } from './normalize';

export type RulesResult = {
  apto_vegano: boolean;
  apto_celiaco: boolean;
  apto_sin_lactosa: boolean;
  reglas_aplicadas: string[];
};

export function apply_rules(product: ProductExtraction): RulesResult {
  const ingredientes = product.ingredientes_detectados.map(normalize);
  const alergenos = product.alergenos.map(normalize);
  const isSinTacc = product.categoria === 'sin TACC';

  const tieneGluten = hasGluten(alergenos, ingredientes, isSinTacc);
  const tieneLacteos = hasLactose(alergenos, ingredientes);
  const tieneAnimal = hasAnimal(alergenos, ingredientes);

  const reglas: string[] = [];
  if (tieneGluten) reglas.push('contiene_gluten');
  if (tieneLacteos) reglas.push('contiene_lacteos');
  if (tieneAnimal) reglas.push('contiene_origen_animal');

  return {
    apto_celiaco: !tieneGluten,
    apto_sin_lactosa: !tieneLacteos,
    apto_vegano: !tieneAnimal,
    reglas_aplicadas: reglas,
  };
}

function matchesAny(haystack: readonly string[], needles: readonly string[]): boolean {
  return needles.some((needle) => haystack.some((hay) => hay.includes(needle)));
}

function hasGluten(
  alergenos: readonly string[],
  ingredientes: readonly string[],
  isSinTacc: boolean,
): boolean {
  if (alergenos.includes('gluten')) return true;
  // "Sin TACC" labelled products: the oat is certified gluten-free, so the
  // mere presence of "avena" in the list shouldn't disqualify them. Other
  // gluten cereals still do — there's no certified-trigo. See spec §10.
  const list = isSinTacc ? NO_CELIAC.filter((x) => x !== 'avena') : NO_CELIAC;
  return matchesAny(ingredientes, list);
}

function hasLactose(alergenos: readonly string[], ingredientes: readonly string[]): boolean {
  if (alergenos.includes('leche')) return true;
  return matchesAny(ingredientes, NO_LACTOSE);
}

function hasAnimal(alergenos: readonly string[], ingredientes: readonly string[]): boolean {
  if (alergenos.includes('huevo')) return true;
  return matchesAny(ingredientes, NO_VEGAN);
}
