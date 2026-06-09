/**
 * `apply_rules` — pure function that derives aptitude flags from a
 * ProductExtraction by combining (a) the LLM's own `apto_*` judgement
 * con (b) nuestras blacklists locales. Spec E03 §3.
 *
 * Conservative by default: para que un producto quede `apto=true`, **ambas
 * señales tienen que coincidir en sí**:
 *
 *   apto_celiaco     := llm.apto_celiaco     && !rules.tieneGluten
 *   apto_sin_lactosa := llm.apto_sin_lactosa && !rules.tieneLacteos
 *   apto_vegano      := llm.apto_vegano      && !rules.tieneAnimal
 *
 * Esto cubre el caso límite donde el LLM no logra leer la lista de
 * ingredientes (devuelve `ingredientes_detectados=[]`, `alergenos=[]`) pero
 * SÍ marca `apto_vegano=false` por el nombre o la foto del producto:
 * antes la regla "no detectó nada → apto=true" pisaba el `false` del LLM.
 * Ahora la regla solo puede DOWNGRADE (marcar no-apto cuando detecta un
 * trigger), nunca UPGRADE.
 *
 * Trade-off: si el LLM se equivoca y dice `apto_vegano=false` para un
 * producto que sí es vegano, el resultado queda en `false`. Es el lado
 * seguro: false negatives son baratos (el usuario revisa el envase),
 * false positives son peligrosos (el usuario consume algo que no podía).
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

  // El LLM puede DOWNGRADE el apto (ej. detectó "carne" en el nombre del
  // producto sin que el ingrediente apareciera en la lista). Trackeamos
  // ese caso en reglas_aplicadas para que la explicación lo refleje.
  if (!product.apto_vegano && !tieneAnimal) reglas.push('llm_marca_no_vegano');
  if (!product.apto_celiaco && !tieneGluten) reglas.push('llm_marca_no_celiaco');
  if (!product.apto_sin_lactosa && !tieneLacteos) reglas.push('llm_marca_con_lactosa');

  return {
    apto_celiaco: !tieneGluten && product.apto_celiaco,
    apto_sin_lactosa: !tieneLacteos && product.apto_sin_lactosa,
    apto_vegano: !tieneAnimal && product.apto_vegano,
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
