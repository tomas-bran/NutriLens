import { describe, expect, it, vi } from 'vitest';

// describePrefs es puro, pero el módulo importa prisma — lo stubbeamos para no
// instanciar el cliente en un test unitario.
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { DEFAULT_PREFS, describePrefs, type DietPrefs } from '@/lib/prefs/server';

const prefs = (over: Partial<DietPrefs>): DietPrefs => ({ ...DEFAULT_PREFS, ...over });

describe('describePrefs (NL-208)', () => {
  it('sin preferencias activas devuelve string vacío (no ensucia el prompt)', () => {
    expect(describePrefs(DEFAULT_PREFS)).toBe('');
    expect(describePrefs(prefs({ avisos: true }))).toBe('');
  });

  it('vegano menciona la dieta vegana', () => {
    expect(describePrefs(prefs({ vegano: true }))).toMatch(/vegana/i);
  });

  it('celíaco menciona el gluten', () => {
    const out = describePrefs(prefs({ celiaco: true }));
    expect(out).toMatch(/celíaco/i);
    expect(out).toMatch(/gluten/i);
  });

  it('lactosa menciona la lactosa', () => {
    expect(describePrefs(prefs({ lactosa: true }))).toMatch(/lactosa/i);
  });

  it('combina varias preferencias en una sola frase', () => {
    const out = describePrefs(prefs({ vegano: true, celiaco: true, lactosa: true }));
    expect(out).toMatch(/vegana/i);
    expect(out).toMatch(/celíaco/i);
    expect(out).toMatch(/lactosa/i);
    expect(out).toMatch(/Priorizá avisarle/);
  });
});
