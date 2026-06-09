/**
 * Tests para el historial de chats (NL-301/302).
 * Cubre generateTitle + tipos básicos.
 */
import { describe, expect, it } from 'vitest';
import { generateTitle } from '@/lib/conversations/types';

describe('generateTitle (NL-301)', () => {
  it('returns full string when ≤60 chars', () => {
    expect(generateTitle('¿Qué productos contienen leche?')).toBe('¿Qué productos contienen leche?');
  });

  it('truncates at word boundary when >60 chars', () => {
    const long = 'Mostrame todos los productos que tienen exceso en sodio y que sean aptos para celíacos';
    const result = generateTitle(long);
    expect(result.length).toBeLessThanOrEqual(63); // 60 + '…'
    expect(result.endsWith('…')).toBe(true);
    // should not cut mid-word
    const withoutEllipsis = result.slice(0, -1);
    expect(long.startsWith(withoutEllipsis)).toBe(true);
  });

  it('truncates at 60 chars if no space found before 30', () => {
    const noSpaces = 'a'.repeat(70);
    const result = generateTitle(noSpaces);
    expect(result).toBe('a'.repeat(60) + '…');
  });

  it('trims leading/trailing whitespace', () => {
    expect(generateTitle('  hola  ')).toBe('hola');
  });

  it('collapses internal whitespace', () => {
    expect(generateTitle('dos   espacios')).toBe('dos espacios');
  });
});

describe('NL-302 — título vacío edge case', () => {
  it('generateTitle with empty string returns empty string', () => {
    expect(generateTitle('')).toBe('');
  });

  it('generateTitle with whitespace only returns empty string', () => {
    expect(generateTitle('   ')).toBe('');
  });
});
