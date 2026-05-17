/**
 * `compute_risk` — pure function. Maps `(sellos, alergenos, reglas_aplicadas)`
 * to one of {bajo, medio, alto}. Truth table in spec E03 §4.2.
 *
 *   ≥2 sellos               → alto
 *   1 sello + ≥2 alergenos  → alto
 *   1 sello + 0-1 alergenos → medio
 *   0 sellos + ≥1 alergenos → medio
 *   0 sellos + 0 alergenos + ≥1 reglas → medio
 *   0 sellos + 0 alergenos + 0 reglas → bajo
 *
 * `confidence` does NOT modify riesgo — the UI surfaces low confidence as
 * a separate badge (spec §4.3 + §6.3).
 */
import type { ProductExtraction, Riesgo } from '@schemas/product';
import type { RulesResult } from './apply';

export function compute_risk(p: ProductExtraction, r: RulesResult): Riesgo {
  const sellos = p.sellos.length;
  const alergenos = p.alergenos.length;

  if (sellos >= 2) return 'alto';
  if (sellos === 1) {
    if (alergenos >= 2) return 'alto';
    return 'medio';
  }
  // sellos === 0
  if (alergenos === 0 && r.reglas_aplicadas.length === 0) return 'bajo';
  return 'medio';
}
