/**
 * Tests del ranking por riesgo + sellos + createdAt (spec E05 §5.1).
 * Tabla de verdad: producto bajo+0 sellos antes que medio+1 sello;
 * bajo+0 antes que bajo+1; createdAt rompe empates al final.
 */
import { describe, it, expect } from 'vitest';
import type { Product as PrismaProduct } from '@prisma/client';
import { rankByRiskAndSellos, RISK_SCORE } from '@/lib/chat/rank';

type Mini = Pick<PrismaProduct, 'riesgo' | 'sellos' | 'createdAt'> & { id: string };

function p(
  id: string,
  riesgo: 'bajo' | 'medio' | 'alto',
  sellos: string[],
  createdAt: string,
): Mini {
  return {
    id,
    riesgo,
    sellos: JSON.stringify(sellos),
    createdAt: new Date(createdAt),
  };
}

describe('rankByRiskAndSellos — tabla de verdad', () => {
  it('riesgo bajo va antes que medio y alto', () => {
    const r = rankByRiskAndSellos([
      p('a', 'alto', [], '2025-01-01'),
      p('b', 'medio', [], '2025-01-01'),
      p('c', 'bajo', [], '2025-01-01'),
    ]);
    expect(r.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });

  it('a igualdad de riesgo, menos sellos primero', () => {
    const r = rankByRiskAndSellos([
      p('a', 'bajo', ['exceso en azúcares', 'exceso en sodio'], '2025-01-01'),
      p('b', 'bajo', [], '2025-01-01'),
      p('c', 'bajo', ['exceso en azúcares'], '2025-01-01'),
    ]);
    expect(r.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('bajo+0 sellos va antes que medio+0 sellos', () => {
    const r = rankByRiskAndSellos([
      p('a', 'medio', [], '2025-01-01'),
      p('b', 'bajo', [], '2025-01-01'),
    ]);
    expect(r[0]!.id).toBe('b');
  });

  it('bajo+0 sellos va antes que medio+1 sello', () => {
    const r = rankByRiskAndSellos([
      p('a', 'medio', ['exceso en azúcares'], '2025-01-01'),
      p('b', 'bajo', [], '2025-01-01'),
    ]);
    expect(r[0]!.id).toBe('b');
  });

  it('a igualdad de riesgo y sellos, más reciente primero', () => {
    const r = rankByRiskAndSellos([
      p('a', 'bajo', [], '2025-01-01'),
      p('b', 'bajo', [], '2025-06-01'),
      p('c', 'bajo', [], '2025-03-01'),
    ]);
    expect(r.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('sellos con JSON inválido cuenta como 0 (no rompe el sort)', () => {
    const broken: Mini = {
      id: 'broken',
      riesgo: 'bajo',
      sellos: 'not-json',
      createdAt: new Date('2025-01-01'),
    };
    const r = rankByRiskAndSellos([broken, p('b', 'bajo', ['exceso en azúcares'], '2025-01-02')]);
    // broken (0 sellos) va primero
    expect(r[0]!.id).toBe('broken');
  });

  it('no muta el array de entrada', () => {
    const input = [p('a', 'alto', [], '2025-01-01'), p('b', 'bajo', [], '2025-01-01')];
    const before = input.map((x) => x.id).join(',');
    rankByRiskAndSellos(input);
    expect(input.map((x) => x.id).join(',')).toBe(before);
  });

  it('RISK_SCORE expone los pesos esperados', () => {
    expect(RISK_SCORE).toEqual({ bajo: 0, medio: 1, alto: 2 });
  });
});
