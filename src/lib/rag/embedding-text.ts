/**
 * Texto canónico que se embebe por producto (NL-401). Una sola función para
 * que persist, el backfill y cualquier futuro re-embed generen EXACTAMENTE
 * el mismo input — cambiar este formato implica re-embeder el historial.
 */
export interface ProductEmbeddingInput {
  nombre: string;
  /** Categoría en español canónico ("lácteos", "sin TACC"). */
  categoria: string;
  ingredientes: string[];
  alergenos: string[];
  sellos: string[];
  aptoVegano: boolean;
  aptoCeliaco: boolean;
  aptoSinLactosa: boolean;
}

export function buildProductEmbeddingText(p: ProductEmbeddingInput): string {
  const aptitudes = [
    p.aptoVegano ? 'vegano' : null,
    p.aptoCeliaco ? 'apto celíacos' : null,
    p.aptoSinLactosa ? 'sin lactosa' : null,
  ].filter(Boolean);

  return [
    `Producto: ${p.nombre}`,
    `Categoría: ${p.categoria}`,
    `Ingredientes: ${p.ingredientes.join(', ') || 'sin datos'}`,
    `Alérgenos: ${p.alergenos.join(', ') || 'ninguno'}`,
    `Sellos de advertencia: ${p.sellos.join(', ') || 'ninguno'}`,
    `Aptitudes: ${aptitudes.join(', ') || 'ninguna declarada'}`,
  ].join('\n');
}
