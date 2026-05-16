/**
 * Canonical product schemas.
 * See `docs/specs/00-overview.md §6` and `E02 §6`.
 *
 * NOTE: domain enum *values* (categorias, alergenos, sellos) are intentionally
 * kept in Spanish — they are the canonical labels the model produces and the
 * UI displays. Field names and types follow English conventions.
 */
import { z } from 'zod';

export const ALERGENOS = [
  'gluten',
  'leche',
  'huevo',
  'soja',
  'frutos secos',
  'maní',
  'pescado',
  'crustáceos',
  'sulfitos',
  'sésamo',
] as const;

export type Alergeno = (typeof ALERGENOS)[number];

export const SELLOS = [
  'exceso en azúcares',
  'exceso en sodio',
  'exceso en grasas saturadas',
  'exceso en grasas totales',
  'exceso en calorías',
] as const;

export type Sello = (typeof SELLOS)[number];

export const CATEGORIAS = [
  'galletitas',
  'cereales',
  'snacks',
  'lácteos',
  'bebidas',
  'sin TACC',
  'veganos',
  'otros',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const RIESGOS = ['bajo', 'medio', 'alto'] as const;
export type Riesgo = (typeof RIESGOS)[number];

/**
 * ProductExtractionSchema — the model output of `extract_with_ia`.
 * Persisted almost as-is; the `apto_*` flags and `riesgo` are overwritten
 * with our own rules in E03 before saving.
 */
export const ProductExtractionSchema = z.object({
  producto: z.string().min(1).max(200),
  categoria: z.enum(CATEGORIAS),
  ingredientes_detectados: z.array(z.string().min(1)).default([]),
  alergenos: z.array(z.enum(ALERGENOS)).default([]),
  sellos: z.array(z.enum(SELLOS)).default([]),
  apto_vegano: z.boolean(),
  apto_celiaco: z.boolean(),
  apto_sin_lactosa: z.boolean(),
  riesgo: z.enum(RIESGOS),
  confidence: z.number().min(0).max(1),
});

export type ProductExtraction = z.infer<typeof ProductExtractionSchema>;

/**
 * LabelKindSchema — output of the `detect_label_kind` step (E01 §6).
 */
export const LabelKindSchema = z.object({
  is_food_label: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export type LabelKind = z.infer<typeof LabelKindSchema>;
