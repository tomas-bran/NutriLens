/**
 * String normalizer used by apply_rules before matching against the blacklists.
 *
 * Per spec E03 §3.1 + §10:
 *   - Lower-case ASCII (blacklists are in lower-case ASCII).
 *   - Strip diacritics (NFD + remove combining marks) so "azúcar" matches
 *     the "azucar" entries.
 *   - Strip the parentheses `(` and `)` characters so "azúcar (mascabo)"
 *     ends up as "azucar mascabo" — `includes("azucar")` still matches.
 *     Note: we keep the content between parens; removing it would break
 *     useful matches like "harina (de trigo)".
 *   - Collapse runs of whitespace and trim ends so trailing spaces left
 *     by the paren removal don't break exact comparisons elsewhere.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
