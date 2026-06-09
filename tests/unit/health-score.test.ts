/**
 * Tests del scoring de salud (NL-403).
 * Cubre la tabla de verdad completa del spec.
 */
import { describe, expect, it } from 'vitest';
import { computeHealthScore, rankByHealthScore } from '@/lib/products/health-score';
import type { HealthScoreInput } from '@/lib/products/health-score';

const BASE: HealthScoreInput = {
  riesgo: 'bajo',
  sellos: '[]',
  aptoVegano: false,
  aptoCeliaco: false,
  aptoSinLactosa: false,
  createdAt: new Date('2026-01-01'),
};

describe('computeHealthScore — tabla de verdad', () => {
  it('riesgo bajo + 0 sellos + 0 aptitudes = score 100', () => {
    expect(computeHealthScore(BASE).score).toBe(100);
  });

  it('riesgo medio = score 90 (−10)', () => {
    expect(computeHealthScore({ ...BASE, riesgo: 'medio' }).score).toBe(90);
  });

  it('riesgo alto = score 80 (−20)', () => {
    expect(computeHealthScore({ ...BASE, riesgo: 'alto' }).score).toBe(80);
  });

  it('1 sello = −3pts', () => {
    const s = computeHealthScore({ ...BASE, sellos: JSON.stringify(['exceso en azúcares']) });
    expect(s.score).toBe(97);
    expect(s.breakdown.sellos).toBe(-3);
  });

  it('5 sellos = −15pts', () => {
    const sellos = JSON.stringify([
      'exceso en azúcares', 'exceso en sodio', 'exceso en grasas saturadas',
      'exceso en grasas totales', 'exceso en calorías',
    ]);
    expect(computeHealthScore({ ...BASE, sellos }).score).toBe(85);
  });

  it('apto vegano +2pts', () => {
    expect(computeHealthScore({ ...BASE, aptoVegano: true }).score).toBe(102);
  });

  it('apto celiaco +2pts', () => {
    expect(computeHealthScore({ ...BASE, aptoCeliaco: true }).score).toBe(102);
  });

  it('apto sin lactosa +2pts', () => {
    expect(computeHealthScore({ ...BASE, aptoSinLactosa: true }).score).toBe(102);
  });

  it('todas las aptitudes = +6pts', () => {
    const s = computeHealthScore({ ...BASE, aptoVegano: true, aptoCeliaco: true, aptoSinLactosa: true });
    expect(s.score).toBe(106);
    expect(s.breakdown.aptitudes).toBe(6);
  });

  it('riesgo alto + 3 sellos + 0 aptitudes = 80 − 9 = 71', () => {
    const s = computeHealthScore({
      ...BASE,
      riesgo: 'alto',
      sellos: JSON.stringify(['exceso en azúcares', 'exceso en sodio', 'exceso en grasas saturadas']),
    });
    expect(s.score).toBe(71);
  });

  it('justification includes riesgo + sellos info', () => {
    const s = computeHealthScore({ ...BASE, riesgo: 'bajo', sellos: '[]' });
    expect(s.justification).toContain('riesgo bajo');
    expect(s.justification).toContain('sin sellos');
  });

  it('justification includes aptitudes when present', () => {
    const s = computeHealthScore({ ...BASE, aptoVegano: true, aptoCeliaco: true });
    expect(s.justification).toContain('vegano');
    expect(s.justification).toContain('celíacos');
  });
});

describe('rankByHealthScore — ordering y tiebreakers', () => {
  it('lower riesgo products rank higher', () => {
    const products: HealthScoreInput[] = [
      { ...BASE, riesgo: 'alto', createdAt: new Date('2026-01-03') },
      { ...BASE, riesgo: 'bajo', createdAt: new Date('2026-01-01') },
      { ...BASE, riesgo: 'medio', createdAt: new Date('2026-01-02') },
    ];
    const ranked = rankByHealthScore(products);
    expect(ranked[0]!.riesgo).toBe('bajo');
    expect(ranked[1]!.riesgo).toBe('medio');
    expect(ranked[2]!.riesgo).toBe('alto');
  });

  it('at same riesgo, fewer sellos ranks higher', () => {
    const many = { ...BASE, sellos: JSON.stringify(['exceso en azúcares', 'exceso en sodio']) };
    const none = { ...BASE, sellos: '[]' };
    const [first, second] = rankByHealthScore([many, none]);
    expect(first!.sellos).toBe('[]');
    expect(second!.sellos).toBe(many.sellos);
  });

  it('tiebreak: same score → more recent product first', () => {
    const older = { ...BASE, createdAt: new Date('2026-01-01') };
    const newer = { ...BASE, createdAt: new Date('2026-06-01') };
    const [first, second] = rankByHealthScore([older, newer]);
    // newer (June 2026) should rank first
    expect(first!.createdAt.getTime()).toBeGreaterThan(second!.createdAt.getTime());
  });

  it('result includes healthScore property', () => {
    const ranked = rankByHealthScore([BASE]);
    expect(ranked[0]).toHaveProperty('healthScore');
    expect(ranked[0]!.healthScore.score).toBe(100);
  });
});
