/**
 * Translators between the Zod-canonical product (with diacritics + spaces)
 * and the Prisma row (snake_case ASCII enums). Centralised here so every
 * persist/load goes through the same mapping.
 *
 * See spec E04 §2 + prisma/schema.prisma for the enum source of truth.
 */
import type { Categoria as PrismaCategoria, Product as PrismaProduct } from '@prisma/client';
import type { Categoria, Riesgo, Sello } from '@schemas/product';
import type { OFFEnrichmentResult } from '@/lib/off/enrich';
import { resolveImageUrl } from '@/lib/storage';

const CAT_ZOD_TO_PRISMA: Record<Categoria, PrismaCategoria> = {
  galletitas: 'galletitas',
  cereales: 'cereales',
  snacks: 'snacks',
  lácteos: 'lacteos',
  bebidas: 'bebidas',
  'sin TACC': 'sin_tacc',
  veganos: 'veganos',
  otros: 'otros',
};

const CAT_PRISMA_TO_ZOD: Record<PrismaCategoria, Categoria> = {
  galletitas: 'galletitas',
  cereales: 'cereales',
  snacks: 'snacks',
  lacteos: 'lácteos',
  bebidas: 'bebidas',
  sin_tacc: 'sin TACC',
  veganos: 'veganos',
  otros: 'otros',
};

export function mapCategoriaToPrisma(c: Categoria): PrismaCategoria {
  return CAT_ZOD_TO_PRISMA[c];
}

export function mapCategoriaFromPrisma(c: PrismaCategoria): Categoria {
  return CAT_PRISMA_TO_ZOD[c];
}

/**
 * Trimmed shape returned by GET /api/products. Excludes payload-heavy
 * fields (jsonRaw, pipelineTrace, ingredientes, explanation) per spec §5.1.
 */
export interface ProductListItem {
  id: string;
  nombre: string;
  categoria: Categoria;
  riesgo: Riesgo;
  alergenos: string[];
  sellos: Sello[];
  aptoVegano: boolean;
  aptoCeliaco: boolean;
  aptoSinLactosa: boolean;
  imagenUrl: string;
  createdAt: string;
}

/** Map a Prisma row to the list-item response shape (spec §5.1). */
export function toListItem(p: PrismaProduct): ProductListItem {
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: mapCategoriaFromPrisma(p.categoria),
    riesgo: p.riesgo as Riesgo,
    alergenos: safeJsonArray(p.alergenos),
    sellos: safeJsonArray(p.sellos) as Sello[],
    aptoVegano: p.aptoVegano,
    aptoCeliaco: p.aptoCeliaco,
    aptoSinLactosa: p.aptoSinLactosa,
    imagenUrl: resolveImageUrl(p.imagenPath),
    createdAt: p.createdAt.toISOString(),
  };
}

/**
 * Full detail shape returned by GET /api/products/[id]. Includes audit
 * fields (jsonRaw, pipelineTrace, reglasAplicadas) per spec §5.2.
 */
export interface ProductDetail extends ProductListItem {
  ingredientes: string[];
  confidence: number;
  reglasAplicadas: string[];
  explanation: string | null;
  jsonRaw: string;
  pipelineTrace: unknown;
  promptVersion: string;
  offEnrichment: OFFEnrichmentResult | null;
}

export function toDetail(p: PrismaProduct): ProductDetail {
  return {
    ...toListItem(p),
    ingredientes: safeJsonArray(p.ingredientes),
    confidence: p.confidence,
    reglasAplicadas: safeJsonArray(p.reglasAplicadas),
    explanation: p.explanation,
    jsonRaw: p.jsonRaw,
    pipelineTrace: safeJsonValue(p.pipelineTrace, []),
    promptVersion: p.promptVersion,
    offEnrichment: p.offEnrichment
      ? safeJsonValue<OFFEnrichmentResult>(p.offEnrichment, null as unknown as OFFEnrichmentResult)
      : null,
  };
}

/** Parse a JSON-serialized array column; returns [] if parsing fails. */
function safeJsonArray(raw: string): string[] {
  return safeJsonValue<string[]>(raw, []);
}

function safeJsonValue<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}
