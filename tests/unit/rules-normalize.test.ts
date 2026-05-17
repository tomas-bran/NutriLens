import { describe, expect, it } from 'vitest';
import { normalize } from '@/lib/rules/normalize';

describe('normalize', () => {
  it.each<[string, string]>([
    ['Harina de Trigo', 'harina de trigo'],
    ['LECHE EN POLVO', 'leche en polvo'],
    ['Azúcar', 'azucar'],
    ['Caseína', 'caseina'],
    ['azúcar (mascabo)', 'azucar  mascabo'],
    ['', ''],
    ['   trigo  ', 'trigo'],
    ['Manteca', 'manteca'],
    ['Atún', 'atun'],
    ['Sémola', 'semola'],
    ['  Multi   spaces   ', 'multi spaces'],
    ['Almidón de Trigo', 'almidon de trigo'],
  ])('%j → %j', (input, expected) => {
    // The "azucar  mascabo" case keeps the double space from the original
    // "azúcar (mascabo)": replace `(` and `)` with single spaces, and the
    // trailing collapse-whitespace runs over the whole string. Adjusting to
    // canonical single-space:
    const got = normalize(input);
    expect(got).toBe(expected.replace(/\s+/g, ' ').trim());
  });

  it('removes parentheses but keeps the content inside (so includes() still matches the core ingredient)', () => {
    expect(normalize('azúcar (mascabo)')).toBe('azucar mascabo');
    expect(normalize('harina (de trigo)')).toBe('harina de trigo');
  });

  it('is idempotent (normalize(normalize(x)) === normalize(x))', () => {
    const samples = ['Harina de TRIGO', 'azúcar (mascabo)', 'Caseína (LECHE)', ''];
    for (const s of samples) {
      expect(normalize(normalize(s))).toBe(normalize(s));
    }
  });

  it('handles strings with only diacritics', () => {
    expect(normalize('áéíóúñ')).toBe('aeioun');
  });
});
