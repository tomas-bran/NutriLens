import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from '@/components/layout/nav-config';

describe('NAV_ITEMS — single source of truth for app navigation', () => {
  it('tiene las 5 entradas (Inicio / Analizar / Catálogo / Chat / Perfil)', () => {
    expect(NAV_ITEMS).toHaveLength(5);
    expect(NAV_ITEMS.map((i) => i.id)).toEqual([
      'inicio',
      'analizar',
      'catalogo',
      'chat',
      'perfil',
    ]);
  });

  it('Perfil es mobileOnly (en desktop vive en el UserMenu)', () => {
    const perfil = NAV_ITEMS.find((i) => i.id === 'perfil');
    expect(perfil?.mobileOnly).toBe(true);
    expect(NAV_ITEMS.filter((i) => i.mobileOnly).map((i) => i.id)).toEqual(['perfil']);
  });

  it('every item maps to a unique href', () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('every item has a label and an icon name', () => {
    for (const item of NAV_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.icon.length).toBeGreaterThan(0);
    }
  });

  it('Inicio points to /', () => {
    expect(NAV_ITEMS.find((i) => i.id === 'inicio')?.href).toBe('/');
  });

  it('Analizar points to /analizar', () => {
    expect(NAV_ITEMS.find((i) => i.id === 'analizar')?.href).toBe('/analizar');
  });
});
