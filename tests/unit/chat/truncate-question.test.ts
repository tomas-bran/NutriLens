/**
 * Tests del recorte de preguntas largas (caso borde §13 del spec E05).
 */
import { describe, it, expect } from 'vitest';
import { QUESTION_MAX_CHARS, truncateQuestion } from '@/lib/chat/truncate-question';

describe('truncateQuestion — cap de 500 chars (spec E05 §13)', () => {
  it('deja intacto un string de 499 chars', () => {
    const raw = 'a'.repeat(499);
    const r = truncateQuestion(raw);
    expect(r.truncated).toBe(false);
    expect(r.text).toBe(raw);
    expect(r.originalLength).toBe(499);
  });

  it('deja intacto un string de exactamente 500 chars', () => {
    const raw = 'a'.repeat(500);
    const r = truncateQuestion(raw);
    expect(r.truncated).toBe(false);
    expect(r.text.length).toBe(500);
  });

  it('corta un string de 501 chars a 500', () => {
    const raw = 'a'.repeat(501);
    const r = truncateQuestion(raw);
    expect(r.truncated).toBe(true);
    expect(r.text.length).toBe(500);
    expect(r.originalLength).toBe(501);
  });

  it('respeta code points multi-byte (emojis no se parten a la mitad)', () => {
    // "🎉" ocupa 2 code units UTF-16 pero 1 code point. Construimos un string
    // donde el carácter 500 (1-indexed) cae justo sobre el emoji.
    const raw = 'a'.repeat(499) + '🎉' + 'b'.repeat(50);
    const r = truncateQuestion(raw);
    expect(r.truncated).toBe(true);
    // Esperamos 500 code points: 499 'a' + 1 emoji completo.
    expect(Array.from(r.text).length).toBe(500);
    expect(r.text.endsWith('🎉')).toBe(true);
  });

  it('un string vacío pasa sin tocar', () => {
    const r = truncateQuestion('');
    expect(r.truncated).toBe(false);
    expect(r.text).toBe('');
    expect(r.originalLength).toBe(0);
  });

  it('respeta el override de max custom', () => {
    const r = truncateQuestion('hola mundo', 4);
    expect(r.truncated).toBe(true);
    expect(r.text).toBe('hola');
  });

  it('exporta QUESTION_MAX_CHARS=500', () => {
    expect(QUESTION_MAX_CHARS).toBe(500);
  });
});
