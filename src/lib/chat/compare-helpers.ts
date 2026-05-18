/**
 * Helpers para el branch `kind=compare` del chat (US-31).
 *
 * - `matchProductsByName`: para cada nombre pedido por el usuario en
 *   `intent.comparar`, decidimos si lo encontramos entre los productos
 *   recuperados de la DB. Usamos matching case-insensitive con
 *   `String.prototype.includes` en ambas direcciones (cualquiera contenga al
 *   otro), porque el usuario escribe variantes ("Choco Crunch" vs
 *   "Cereales Choco Crunch 500g").
 * - `findMissingComparables`: devuelve los nombres que NO matchearon contra
 *   ningún producto recuperado (escenario 2 del AC: producto faltante).
 * - `buildMissingProductMessage`: arma el texto del fallback canónico cuando
 *   hay nombres sin match (spec §13: "No tengo X guardado, ¿lo querés
 *   analizar?").
 */
import type { Product as PrismaProduct } from '@prisma/client';

export interface NameMatch {
  /** Nombre pedido por el usuario (tal cual lo escribió). */
  requested: string;
  /** Producto que matchea, o `null` si no se encontró ninguno. */
  matched: PrismaProduct | null;
}

export function matchProductsByName(
  requestedNames: string[],
  products: PrismaProduct[],
): NameMatch[] {
  return requestedNames.map((requested) => ({
    requested,
    matched: products.find((p) => namesMatch(p.nombre, requested)) ?? null,
  }));
}

export function findMissingComparables(
  requestedNames: string[],
  products: PrismaProduct[],
): string[] {
  return matchProductsByName(requestedNames, products)
    .filter((m) => m.matched === null)
    .map((m) => m.requested);
}

/**
 * Mensaje canónico cuando uno o más productos del compare no están en el
 * historial. Spec E05 §13.
 */
export function buildMissingProductMessage(missing: string[]): string {
  if (missing.length === 0) return '';
  if (missing.length === 1) {
    return `No tengo "${missing[0]}" guardado en tu historial. ¿Lo querés analizar primero?`;
  }
  const list = missing.map((n) => `"${n}"`).join(' y ');
  return `No tengo ${list} guardados en tu historial. ¿Los querés analizar primero?`;
}

/**
 * Match laxo: cualquiera de los nombres contiene al otro (case+diacritic
 * insensitive). Esto permite que el usuario escriba "Galletitas X" y matchee
 * con "Galletitas Sin TACC X Pack 250g" sin necesidad de copiar el nombre
 * exacto.
 */
function namesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .trim();
}
