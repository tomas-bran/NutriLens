/**
 * Unit tests del ChatIntentSchema. 10+ fixtures cubriendo los 4 valores de
 * `kind` (filter / info / compare / unknown), la coerción de `""` a null y los
 * rechazos por enum inválido o tipo equivocado.
 * Spec: `docs/specs/E05-chat-rag.md §4.2 + §11`.
 */
import { describe, it, expect } from 'vitest';
import { ChatIntentSchema, UNKNOWN_INTENT } from '@/lib/chat/intent-schema';

describe('ChatIntentSchema — happy paths por cada kind', () => {
  it('parsea un filter completo (galletitas + apto celiaco)', () => {
    const parsed = ChatIntentSchema.parse({
      kind: 'filter',
      categoria: 'galletitas',
      riesgo_max: null,
      apto: 'celiaco',
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    });
    expect(parsed.kind).toBe('filter');
    expect(parsed.categoria).toBe('galletitas');
    expect(parsed.apto).toBe('celiaco');
  });

  it('parsea un info con keywords (con tildes)', () => {
    const parsed = ChatIntentSchema.parse({
      kind: 'info',
      categoria: null,
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: ['leche', 'azúcar'],
      comparar: [],
    });
    expect(parsed.kind).toBe('info');
    expect(parsed.keywords).toEqual(['leche', 'azúcar']);
  });

  it('parsea un info con alergeno_excluido (sin gluten)', () => {
    const parsed = ChatIntentSchema.parse({
      kind: 'info',
      categoria: null,
      riesgo_max: null,
      apto: null,
      alergeno_excluido: 'gluten',
      keywords: [],
      comparar: [],
    });
    expect(parsed.alergeno_excluido).toBe('gluten');
  });

  it('parsea un compare con dos nombres', () => {
    const parsed = ChatIntentSchema.parse({
      kind: 'compare',
      categoria: null,
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: [],
      comparar: ['Galletitas X', 'Galletitas Y'],
    });
    expect(parsed.kind).toBe('compare');
    expect(parsed.comparar).toEqual(['Galletitas X', 'Galletitas Y']);
  });

  it('parsea un unknown con todo en null/array vacío', () => {
    const parsed = ChatIntentSchema.parse({
      kind: 'unknown',
      categoria: null,
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    });
    expect(parsed).toEqual(UNKNOWN_INTENT);
  });

  it('parsea filter con riesgo_max=bajo ("mejor perfil nutricional")', () => {
    const parsed = ChatIntentSchema.parse({
      kind: 'filter',
      categoria: 'galletitas',
      riesgo_max: 'bajo',
      apto: null,
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    });
    expect(parsed.riesgo_max).toBe('bajo');
  });

  it('acepta categoria con espacios y caracteres especiales ("sin TACC", "lácteos")', () => {
    const sinTacc = ChatIntentSchema.parse({
      kind: 'filter',
      categoria: 'sin TACC',
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    });
    expect(sinTacc.categoria).toBe('sin TACC');

    const lacteos = ChatIntentSchema.parse({
      kind: 'filter',
      categoria: 'lácteos',
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    });
    expect(lacteos.categoria).toBe('lácteos');
  });
});

describe('ChatIntentSchema — coerción defensiva (Phi-4 es relajado con tipos)', () => {
  it('coerce "" a null en categoria', () => {
    const parsed = ChatIntentSchema.parse({
      kind: 'filter',
      categoria: '',
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    });
    expect(parsed.categoria).toBeNull();
  });

  it('coerce "" a null en riesgo_max y apto', () => {
    const parsed = ChatIntentSchema.parse({
      kind: 'filter',
      categoria: null,
      riesgo_max: '',
      apto: '',
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    });
    expect(parsed.riesgo_max).toBeNull();
    expect(parsed.apto).toBeNull();
  });

  it('coerce alergeno_excluido "" o solo espacios a null', () => {
    const parsedEmpty = ChatIntentSchema.parse({
      kind: 'info',
      categoria: null,
      riesgo_max: null,
      apto: null,
      alergeno_excluido: '',
      keywords: [],
      comparar: [],
    });
    expect(parsedEmpty.alergeno_excluido).toBeNull();

    const parsedSpaces = ChatIntentSchema.parse({
      kind: 'info',
      categoria: null,
      riesgo_max: null,
      apto: null,
      alergeno_excluido: '   ',
      keywords: [],
      comparar: [],
    });
    expect(parsedSpaces.alergeno_excluido).toBeNull();
  });

  it('aplica defaults cuando faltan campos opcionales', () => {
    const parsed = ChatIntentSchema.parse({ kind: 'unknown' });
    expect(parsed).toEqual(UNKNOWN_INTENT);
  });
});

describe('ChatIntentSchema — rechazos', () => {
  it('rechaza kind fuera del enum', () => {
    const r = ChatIntentSchema.safeParse({
      kind: 'something_else',
      categoria: null,
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    });
    expect(r.success).toBe(false);
  });

  it('rechaza categoria fuera del enum (random string)', () => {
    const r = ChatIntentSchema.safeParse({
      kind: 'filter',
      categoria: 'helados',
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    });
    expect(r.success).toBe(false);
  });

  it('rechaza riesgo_max fuera del enum', () => {
    const r = ChatIntentSchema.safeParse({
      kind: 'filter',
      categoria: null,
      riesgo_max: 'medio-alto',
      apto: null,
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    });
    expect(r.success).toBe(false);
  });

  it('rechaza apto fuera del enum', () => {
    const r = ChatIntentSchema.safeParse({
      kind: 'filter',
      categoria: null,
      riesgo_max: null,
      apto: 'kosher',
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    });
    expect(r.success).toBe(false);
  });

  it('rechaza keywords no-array', () => {
    const r = ChatIntentSchema.safeParse({
      kind: 'info',
      categoria: null,
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: 'leche',
      comparar: [],
    });
    expect(r.success).toBe(false);
  });

  it('rechaza item vacío en keywords (min(1))', () => {
    const r = ChatIntentSchema.safeParse({
      kind: 'info',
      categoria: null,
      riesgo_max: null,
      apto: null,
      alergeno_excluido: null,
      keywords: ['leche', ''],
      comparar: [],
    });
    expect(r.success).toBe(false);
  });
});
