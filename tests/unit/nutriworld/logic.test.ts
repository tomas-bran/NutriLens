/**
 * Tests de la capa lógica de NutriWorld (parser, filtro, resolución, mapeo del
 * intent del chat). Cubre los casos del handoff (requirements §Testing).
 */
import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '@/features/nutriworld/data/products';
import { parseQuery } from '@/features/nutriworld/logic/parseQuery';
import { findProducts } from '@/features/nutriworld/logic/findProducts';
import { resolveIntent } from '@/features/nutriworld/logic/resolveIntent';
import { mapChatIntent } from '@/features/nutriworld/logic/mapChatIntent';

describe('parseQuery', () => {
  it('"galletitas aptas para celíacos" → categoria galletitas + apto_celiaco', () => {
    const r = parseQuery('Mostrame galletitas aptas para celíacos');
    expect(r.kind).toBe('find_products');
    expect(r.category).toBe('galletitas');
    expect(r.filters.apto_celiaco).toBe(true);
  });

  it('"algo sin lactosa" → apto_sin_lactosa', () => {
    const r = parseQuery('Quiero algo sin lactosa');
    expect(r.filters.apto_sin_lactosa).toBe(true);
  });

  it('"productos veganos" → apto_vegano', () => {
    expect(parseQuery('Buscá productos veganos').filters.apto_vegano).toBe(true);
  });

  it('"snacks de riesgo bajo" → snacks + max_riesgo bajo', () => {
    const r = parseQuery('Buscá snacks de riesgo bajo');
    expect(r.category).toBe('snacks');
    expect(r.filters.max_riesgo).toBe('bajo');
  });

  it('consulta ambigua ("algo") → clarify, sin filtros', () => {
    const r = parseQuery('mostrame algo');
    expect(r.kind).toBe('clarify');
    expect(r.category).toBeUndefined();
  });

  it('ignora tildes y mayúsculas', () => {
    expect(parseQuery('GALLETITAS SIN GLUTEN').filters.apto_celiaco).toBe(true);
  });
});

describe('findProducts', () => {
  it('apto_celiaco=true → solo productos celíacos', () => {
    const found = findProducts(
      { kind: 'find_products', filters: { apto_celiaco: true } },
      PRODUCTS,
    );
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((p) => p.aptoCeliaco)).toBe(true);
  });

  it('categoría galletitas + apto_celiaco → solo galletitas aptas', () => {
    const found = findProducts(
      { kind: 'find_products', category: 'galletitas', filters: { apto_celiaco: true } },
      PRODUCTS,
    );
    expect(found.every((p) => p.category === 'galletitas' && p.aptoCeliaco)).toBe(true);
    expect(found.map((p) => p.id)).toEqual(
      expect.arrayContaining(['prod_avena_sintacc', 'prod_rice_cookies']),
    );
  });

  it('riesgo es match EXACTO (bajo no trae medio/alto)', () => {
    const found = findProducts(
      { kind: 'find_products', filters: { max_riesgo: 'bajo' } },
      PRODUCTS,
    );
    expect(found.every((p) => p.risk === 'bajo')).toBe(true);
  });

  it('sin match → []', () => {
    const found = findProducts(
      {
        kind: 'find_products',
        category: 'bebidas',
        filters: { apto_celiaco: true, max_riesgo: 'alto' },
      },
      PRODUCTS,
    );
    expect(found).toEqual([]);
  });
});

describe('resolveIntent', () => {
  it('caso exitoso: galletitas celíacas → guiding + góndola sin_tacc + resalta', () => {
    const r = resolveIntent(parseQuery('Mostrame galletitas aptas para celíacos'), PRODUCTS);
    expect(r.status).toBe('guiding');
    expect(r.targetZone).toBe('sin_tacc');
    expect(r.highlightProductIds.length).toBeGreaterThan(0);
    expect(r.message).toMatch(/Sin TACC/);
  });

  it('caso sin resultados → no_results, no se mueve', () => {
    const r = resolveIntent(
      {
        kind: 'find_products',
        category: 'bebidas',
        filters: { apto_celiaco: true, max_riesgo: 'alto' },
      },
      PRODUCTS,
    );
    expect(r.status).toBe('no_results');
    expect(r.targetZone).toBeNull();
    expect(r.highlightProductIds).toEqual([]);
  });

  it('caso ambiguo → thinking, sin zona', () => {
    const r = resolveIntent(parseQuery('mostrame algo'), PRODUCTS);
    expect(r.status).toBe('thinking');
    expect(r.targetZone).toBeNull();
  });
});

describe('mapChatIntent', () => {
  it('mapea apto + categoría + riesgo del chat al intent de NutriWorld', () => {
    const r = mapChatIntent({ categoria: 'galletitas', apto: 'celiaco', riesgo_max: 'bajo' });
    expect(r.kind).toBe('find_products');
    expect(r.category).toBe('galletitas');
    expect(r.filters.apto_celiaco).toBe(true);
    expect(r.filters.max_riesgo).toBe('bajo');
  });

  it('descarta categorías que no existen en NutriWorld (lacteos → undefined)', () => {
    const r = mapChatIntent({ categoria: 'lacteos', apto: null, riesgo_max: null });
    expect(r.category).toBeUndefined();
    expect(r.kind).toBe('clarify');
  });

  it('sin filtros usables → clarify', () => {
    expect(mapChatIntent({ categoria: null, apto: null, riesgo_max: null }).kind).toBe('clarify');
  });
});
