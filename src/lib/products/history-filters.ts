/**
 * Helpers to encode/decode `/catalogo` filter state ↔ URLSearchParams.
 *
 * Spec: `docs/specs/E04-persistencia-e-historial.md §6.4` (US-24).
 * Filters live in the URL so back/forward navigation works without state.
 * Changing any filter resets `page=1`; only the `page` mutator preserves it.
 */
import {
  ALERGENOS,
  CATEGORIAS,
  RIESGOS,
  type Alergeno,
  type Categoria,
  type Riesgo,
} from '@schemas/product';
import { APTO_VALUES, type Apto } from '@/lib/products/query-schema';

export interface HistoryFilters {
  categoria?: Categoria;
  riesgo?: Riesgo;
  alergeno?: Alergeno;
  apto?: Apto;
  q?: string;
  page: number;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Coerce raw `searchParams` into a typed HistoryFilters. Unknown enum values,
 * empty strings and `page<1` are silently discarded so an arbitrary URL never
 * crashes the page — worst case we render the unfiltered list.
 */
export function parseHistoryFilters(raw: RawSearchParams): HistoryFilters {
  return {
    categoria: pickEnum(raw.categoria, CATEGORIAS),
    riesgo: pickEnum(raw.riesgo, RIESGOS),
    alergeno: pickEnum(raw.alergeno, ALERGENOS),
    apto: pickEnum(raw.apto, APTO_VALUES),
    q: pickString(raw.q),
    page: pickPage(raw.page),
  };
}

/**
 * Build the URL search string ("/catalogo?categoria=...&page=N") for a
 * filters object. Empty fields are omitted; page=1 is omitted too because
 * it's the default and keeps URLs tidy.
 */
export function buildHistoryUrl(filters: HistoryFilters, basePath = '/catalogo'): string {
  const params = new URLSearchParams();
  if (filters.categoria) params.set('categoria', filters.categoria);
  if (filters.riesgo) params.set('riesgo', filters.riesgo);
  if (filters.alergeno) params.set('alergeno', filters.alergeno);
  if (filters.apto) params.set('apto', filters.apto);
  if (filters.q) params.set('q', filters.q);
  if (filters.page > 1) params.set('page', String(filters.page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Returns a new filters object with one filter cleared. Always resets page to 1
 * (E04 §6.4: "Cambiar un filtro resetea la paginación a page=1").
 */
export function clearFilter(filters: HistoryFilters, key: ActiveFilterKey): HistoryFilters {
  const next: HistoryFilters = { ...filters, page: 1 };
  delete next[key];
  return next;
}

/**
 * Replace one filter with a new value (or clear it when value is empty).
 * Resets page=1.
 */
export function setFilter<K extends ActiveFilterKey>(
  filters: HistoryFilters,
  key: K,
  value: HistoryFilters[K] | undefined,
): HistoryFilters {
  const next: HistoryFilters = { ...filters, page: 1 };
  if (value === undefined || value === '') {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next;
}

/** Returns true when any user-facing filter is active (excludes `page`). */
export function hasActiveFilters(filters: HistoryFilters): boolean {
  return Boolean(
    filters.categoria || filters.riesgo || filters.alergeno || filters.apto || filters.q,
  );
}

export type ActiveFilterKey = 'categoria' | 'riesgo' | 'alergeno' | 'apto' | 'q';

export interface ActiveFilter {
  key: ActiveFilterKey;
  label: string;
  value: string;
}

const APTO_LABEL: Record<Apto, string> = {
  vegano: 'Apto vegano',
  celiaco: 'Apto celíaco',
  sin_lactosa: 'Sin lactosa',
};

const RIESGO_LABEL: Record<Riesgo, string> = {
  bajo: 'Riesgo bajo',
  medio: 'Riesgo medio',
  alto: 'Riesgo alto',
};

/** Human-readable list of active filters — used by the chip strip. */
export function describeActiveFilters(filters: HistoryFilters): ReadonlyArray<ActiveFilter> {
  const out: ActiveFilter[] = [];
  if (filters.categoria) {
    out.push({
      key: 'categoria',
      label: `Categoría: ${filters.categoria}`,
      value: filters.categoria,
    });
  }
  if (filters.riesgo) {
    out.push({ key: 'riesgo', label: RIESGO_LABEL[filters.riesgo], value: filters.riesgo });
  }
  if (filters.alergeno) {
    out.push({ key: 'alergeno', label: `Con ${filters.alergeno}`, value: filters.alergeno });
  }
  if (filters.apto) {
    out.push({ key: 'apto', label: APTO_LABEL[filters.apto], value: filters.apto });
  }
  if (filters.q) {
    out.push({ key: 'q', label: `“${filters.q}”`, value: filters.q });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Internal coercion helpers
// ---------------------------------------------------------------------------

function pickString(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return pickString(raw[0]);
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function pickEnum<T extends string>(
  raw: string | string[] | undefined,
  allowed: ReadonlyArray<T>,
): T | undefined {
  const s = pickString(raw);
  return s && (allowed as ReadonlyArray<string>).includes(s) ? (s as T) : undefined;
}

function pickPage(raw: string | string[] | undefined): number {
  const s = pickString(raw);
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}
