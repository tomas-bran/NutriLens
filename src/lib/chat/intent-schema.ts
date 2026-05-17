/**
 * Schema Zod del intent del chat (parser de preguntas del usuario).
 * Ver `docs/specs/E05-chat-rag.md §4.2`.
 *
 * Diseño tolerante: si el modelo emite el campo como `""` o se le olvida, lo
 * coercemos a null. Cualquier desvío del enum cae a null (no rompemos la
 * respuesta del usuario por un parsing débil — preferimos `kind=unknown` antes
 * que un 500).
 */
import { z } from 'zod';
import { CATEGORIAS, type Categoria } from '@schemas/product';

export const CHAT_INTENT_KINDS = ['filter', 'compare', 'info', 'unknown'] as const;
export type ChatIntentKind = (typeof CHAT_INTENT_KINDS)[number];

export const CHAT_APTO_VALUES = ['vegano', 'celiaco', 'sin_lactosa'] as const;
export type ChatApto = (typeof CHAT_APTO_VALUES)[number];

export const CHAT_RIESGO_MAX_VALUES = ['bajo', 'medio', 'alto'] as const;
export type ChatRiesgoMax = (typeof CHAT_RIESGO_MAX_VALUES)[number];

const categoriaCoerce = z
  .union([z.enum(CATEGORIAS), z.literal(''), z.null()])
  .transform((v) => (v === '' || v === null ? null : (v as Categoria)));

const stringOrNull = z
  .union([z.string(), z.null()])
  .transform((v) => (v === null || v.trim() === '' ? null : v.trim()));

export const ChatIntentSchema = z.object({
  kind: z.enum(CHAT_INTENT_KINDS),
  categoria: categoriaCoerce.default(null),
  riesgo_max: z
    .union([z.enum(CHAT_RIESGO_MAX_VALUES), z.literal(''), z.null()])
    .transform((v) => (v === '' || v === null ? null : (v as ChatRiesgoMax)))
    .default(null),
  apto: z
    .union([z.enum(CHAT_APTO_VALUES), z.literal(''), z.null()])
    .transform((v) => (v === '' || v === null ? null : (v as ChatApto)))
    .default(null),
  alergeno_excluido: stringOrNull.default(null),
  keywords: z.array(z.string().min(1)).default([]),
  comparar: z.array(z.string().min(1)).default([]),
});

export type ChatIntent = z.infer<typeof ChatIntentSchema>;

/** Intent canónico de fallback cuando el parser falla. */
export const UNKNOWN_INTENT: ChatIntent = {
  kind: 'unknown',
  categoria: null,
  riesgo_max: null,
  apto: null,
  alergeno_excluido: null,
  keywords: [],
  comparar: [],
};
