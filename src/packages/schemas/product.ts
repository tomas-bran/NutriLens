/**
 * Schemas canónicos del producto.
 * Ver `docs/specs/00-overview.md §6` y `E02 §6`.
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
 * ProductExtractionSchema — la salida del modelo de IA tras `extract_with_ia`.
 * Lo persistimos casi tal cual; las flags `apto_*` y `riesgo` se sobreescriben
 * con las reglas propias de E03 antes de guardar.
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
 * LabelKindSchema — output del step `detect_label_kind` (E01 §6).
 */
export const LabelKindSchema = z.object({
  is_food_label: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export type LabelKind = z.infer<typeof LabelKindSchema>;
