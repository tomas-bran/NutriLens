/**
 * Zod schema for the GET /api/products query string. Coerces strings to
 * numbers, enforces enum membership for categoria/riesgo/apto, and clamps
 * pageSize to the spec maximum of 50.
 *
 * Invalid input maps to ApiError 'invalid_query' (HTTP 400) — see spec §7.
 */
import { z } from 'zod';
import { ALERGENOS, CATEGORIAS, RIESGOS } from '@schemas/product';

export const APTO_VALUES = ['vegano', 'celiaco', 'sin_lactosa'] as const;
export type Apto = (typeof APTO_VALUES)[number];

export const SORT_VALUES = ['createdAt:desc', 'nombre:asc'] as const;
export type Sort = (typeof SORT_VALUES)[number];

export const MAX_PAGE_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 20;

export const ProductsQuerySchema = z.object({
  categoria: z.enum(CATEGORIAS).optional(),
  riesgo: z.enum(RIESGOS).optional(),
  alergeno: z.enum(ALERGENOS).optional(),
  apto: z.enum(APTO_VALUES).optional(),
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sort: z.enum(SORT_VALUES).default('createdAt:desc'),
});

export type ProductsQuery = z.infer<typeof ProductsQuerySchema>;
