/**
 * Unit tests for the `/catalogo` filter helpers.
 * Pure utilities (no React) — every Gherkin escenario of US-24 lands on
 * either these helpers or the UI components built on top.
 */
import { describe, expect, it } from 'vitest';
import {
  buildHistoryUrl,
  clearFilter,
  describeActiveFilters,
  hasActiveFilters,
  parseHistoryFilters,
  setFilter,
} from '@/lib/products/history-filters';

describe('parseHistoryFilters', () => {
  it('returns page=1 + no filters when params are empty', () => {
    expect(parseHistoryFilters({})).toEqual({ page: 1 });
  });

  it('parses every supported filter from raw params', () => {
    expect(
      parseHistoryFilters({
        categoria: 'galletitas',
        riesgo: 'alto',
        alergeno: 'gluten',
        apto: 'vegano',
        q: 'choco',
        page: '3',
      }),
    ).toEqual({
      categoria: 'galletitas',
      riesgo: 'alto',
      alergeno: 'gluten',
      apto: 'vegano',
      q: 'choco',
      page: 3,
    });
  });

  it('drops unknown enum values silently', () => {
    expect(
      parseHistoryFilters({
        categoria: 'martian-food',
        riesgo: 'extremo',
        alergeno: 'unobtainium',
        apto: 'pescovegano',
      }),
    ).toEqual({ page: 1 });
  });

  it('treats empty strings as missing filters', () => {
    expect(parseHistoryFilters({ categoria: '', q: '   ' })).toEqual({ page: 1 });
  });

  it('clamps invalid pages to 1', () => {
    expect(parseHistoryFilters({ page: 'abc' }).page).toBe(1);
    expect(parseHistoryFilters({ page: '-5' }).page).toBe(1);
    expect(parseHistoryFilters({ page: '0' }).page).toBe(1);
  });

  it('flattens single-value array params (Next supplies them as arrays sometimes)', () => {
    expect(parseHistoryFilters({ categoria: ['snacks'] })).toEqual({
      categoria: 'snacks',
      page: 1,
    });
  });
});

describe('parseHistoryFilters — "Analizados por vos" (filtro=mios)', () => {
  it('parses filtro=mios into mios:true', () => {
    expect(parseHistoryFilters({ filtro: 'mios' }).mios).toBe(true);
  });

  it('ignores any other filtro value (only "mios" turns it on)', () => {
    expect(parseHistoryFilters({ filtro: 'todos' }).mios).toBeUndefined();
    expect(parseHistoryFilters({ filtro: '' }).mios).toBeUndefined();
    expect(parseHistoryFilters({}).mios).toBeUndefined();
  });

  it('combines with other filters', () => {
    expect(parseHistoryFilters({ filtro: 'mios', categoria: 'snacks' })).toMatchObject({
      mios: true,
      categoria: 'snacks',
    });
  });
});

describe('buildHistoryUrl', () => {
  it('returns the bare path when no filter is active', () => {
    expect(buildHistoryUrl({ page: 1 })).toBe('/catalogo');
  });

  it('emits filtro=mios when mios is on', () => {
    expect(buildHistoryUrl({ mios: true, page: 1 })).toBe('/catalogo?filtro=mios');
  });

  it('keeps mios alongside the other filters', () => {
    const url = buildHistoryUrl({ mios: true, categoria: 'snacks', page: 2 });
    expect(url).toContain('filtro=mios');
    expect(url).toContain('categoria=snacks');
    expect(url).toContain('page=2');
  });

  it('emits all filters as query params and preserves order roughly', () => {
    const url = buildHistoryUrl({
      categoria: 'galletitas',
      riesgo: 'alto',
      alergeno: 'gluten',
      page: 1,
    });
    expect(url).toContain('categoria=galletitas');
    expect(url).toContain('riesgo=alto');
    expect(url).toContain('alergeno=gluten');
  });

  it('omits page when page=1 (default)', () => {
    const url = buildHistoryUrl({ categoria: 'snacks', page: 1 });
    expect(url).not.toContain('page=');
  });

  it('includes page when > 1', () => {
    const url = buildHistoryUrl({ page: 3 });
    expect(url).toBe('/catalogo?page=3');
  });

  it('URL-encodes free-text q', () => {
    const url = buildHistoryUrl({ q: 'chocolate & galletas', page: 1 });
    expect(url).toContain('q=chocolate+%26+galletas');
  });
});

describe('setFilter', () => {
  it('updates the filter and resets page to 1', () => {
    const next = setFilter({ page: 4 }, 'categoria', 'snacks');
    expect(next).toEqual({ categoria: 'snacks', page: 1 });
  });

  it('clears the filter when value is undefined', () => {
    const next = setFilter({ categoria: 'snacks', page: 2 }, 'categoria', undefined);
    expect(next.categoria).toBeUndefined();
    expect(next.page).toBe(1);
  });

  it('clears the filter when value is empty string', () => {
    const next = setFilter({ q: 'choco', page: 1 }, 'q', '');
    expect(next.q).toBeUndefined();
  });

  it('does not mutate the input', () => {
    const orig = { categoria: 'snacks' as const, page: 3 };
    setFilter(orig, 'riesgo', 'alto');
    expect(orig).toEqual({ categoria: 'snacks', page: 3 });
  });
});

describe('clearFilter', () => {
  it('drops the specified filter and resets page', () => {
    const next = clearFilter({ categoria: 'galletitas', riesgo: 'alto', page: 3 }, 'categoria');
    expect(next).toEqual({ riesgo: 'alto', page: 1 });
  });

  it("is a no-op for filters that weren't set (still resets page)", () => {
    const next = clearFilter({ page: 4 }, 'q');
    expect(next).toEqual({ page: 1 });
  });
});

describe('hasActiveFilters', () => {
  it('is false when only page is set', () => {
    expect(hasActiveFilters({ page: 1 })).toBe(false);
    expect(hasActiveFilters({ page: 5 })).toBe(false);
  });

  it('is true when any non-page filter is present', () => {
    expect(hasActiveFilters({ categoria: 'galletitas', page: 1 })).toBe(true);
    expect(hasActiveFilters({ q: 'choco', page: 1 })).toBe(true);
    expect(hasActiveFilters({ apto: 'vegano', page: 1 })).toBe(true);
  });

  it('counts the "Analizados por vos" scope as an active filter', () => {
    expect(hasActiveFilters({ mios: true, page: 1 })).toBe(true);
  });
});

describe('describeActiveFilters', () => {
  it('returns an empty list when no filters are active', () => {
    expect(describeActiveFilters({ page: 1 })).toHaveLength(0);
  });

  it('formats each filter with a human label', () => {
    const chips = describeActiveFilters({
      categoria: 'galletitas',
      riesgo: 'alto',
      alergeno: 'gluten',
      apto: 'celiaco',
      q: 'choco',
      page: 1,
    });
    expect(chips.map((c) => c.key)).toEqual(['categoria', 'riesgo', 'alergeno', 'apto', 'q']);
    expect(chips.find((c) => c.key === 'riesgo')?.label).toBe('Riesgo alto');
    expect(chips.find((c) => c.key === 'apto')?.label).toBe('Apto celíaco');
    expect(chips.find((c) => c.key === 'q')?.label).toBe('“choco”');
  });
});
