/**
 * Ingredient blacklists for apply_rules. Strings live in lower-case ASCII
 * (no diacritics) so the matcher can compare them against `normalize()`-ed
 * input with a plain `includes()`.
 *
 * To add a new ingredient, append to the relevant array and ship a PR —
 * apply_rules picks it up automatically. See spec E03 §3.1.
 */

/** Anything that disqualifies the product for celiac diets. */
export const NO_CELIAC = [
  'trigo',
  'harina de trigo',
  'cebada',
  'malta',
  'malta de cebada',
  'centeno',
  // avena gets a special exception in apply.ts when categoria === 'sin TACC'
  // (see spec §10 "Avena"). The entry stays here so the default-conservative
  // behavior holds for any uncertified oats.
  'avena',
  'gluten',
  'semola',
  'cuscus',
  'bulgur',
  'almidon de trigo',
] as const;

/** Anything that disqualifies the product for lactose-free diets. */
export const NO_LACTOSE = [
  'leche',
  'leche en polvo',
  'leche entera',
  'leche descremada',
  'lactosa',
  'suero',
  'suero de leche',
  'caseina',
  'caseinato',
  'manteca',
  'crema',
  'yogur',
  'queso',
  'ricota',
  'requeson',
] as const;

/** Anything that disqualifies the product for vegan diets — includes lactose. */
export const NO_VEGAN = [
  ...NO_LACTOSE,
  // animal (excepto lácteos, ya cubiertos arriba)
  'carne',
  'pollo',
  'cerdo',
  'pescado',
  'atun',
  'salmon',
  'gelatina',
  'huevo',
  'clara de huevo',
  'yema',
  'miel',
  'cochinilla',
  'carmin',
  'acido carminico',
  'shellac',
] as const;
