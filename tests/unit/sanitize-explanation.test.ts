import { describe, expect, it } from 'vitest';
import {
  BLOCKED_PHRASES,
  CHAT_DISCLAIMER_TAIL,
  DISCLAIMER_NEEDLE,
  DISCLAIMER_TAIL,
  REMOVED_MARKER,
  sanitizeExplanation,
} from '@/lib/ai/sanitize-explanation';

describe('sanitizeExplanation — blocked phrases (spec §5.5)', () => {
  it.each<[string, string]>([
    // The blocklist regex variants we want to catch
    ['Si dudas, consultá a un médico antes de consumirlo.', 'consulta_medico'],
    ['Si tenés dudas, consulta a un medico de confianza.', 'consulta_medico'],
    [
      'Este producto es peligroso para tu salud por su alto contenido de azúcares.',
      'peligroso_salud',
    ],
    ['No consumir si tenés intolerancia a la lactosa.', 'no_consumir'],
    ['Es tóxico para personas alérgicas.', 'es_toxico'],
  ])('replaces "%s" and reports pattern %s', (raw, expectedPattern) => {
    const out = sanitizeExplanation(raw);
    expect(out.text).toContain(REMOVED_MARKER);
    expect(out.matchedPatterns).toContain(expectedPattern);
  });

  it('catches every BLOCKED_PHRASES entry with a hand-crafted sample', () => {
    // Sanity: we have exactly 4 patterns; the labels above already cover them.
    expect(BLOCKED_PHRASES).toHaveLength(4);
  });

  it('replaces multiple blocked phrases in a single text', () => {
    const out = sanitizeExplanation(
      'No consumir este producto. Consultá a un médico antes de comerlo.',
    );
    expect(out.matchedPatterns.sort()).toEqual(['consulta_medico', 'no_consumir']);
    expect(out.text.match(/\[texto removido\]/g)).toHaveLength(2);
  });
});

describe('sanitizeExplanation — disclaimer (US-19)', () => {
  it('appends DISCLAIMER_TAIL when the input lacks the disclaimer', () => {
    const out = sanitizeExplanation('Producto con alto contenido de azúcar.');
    expect(out.disclaimerAppended).toBe(true);
    expect(out.text).toContain(DISCLAIMER_NEEDLE);
    expect(out.text.endsWith(DISCLAIMER_TAIL)).toBe(true);
  });

  it('does NOT append the disclaimer when the model already included it (idempotent on disclaimer)', () => {
    const original = 'Producto OK. Recordá que NutriLens es un asistente informativo.';
    const out = sanitizeExplanation(original);
    expect(out.disclaimerAppended).toBe(false);
    expect(out.text).toBe(original);
  });

  it('counts as disclaimer even when phrased without the leading "Recordá que"', () => {
    const out = sanitizeExplanation(
      'NutriLens es un asistente informativo. Producto sin restricciones.',
    );
    expect(out.disclaimerAppended).toBe(false);
  });

  it('appends the disclaimer alone when the model returns an empty string', () => {
    const out = sanitizeExplanation('');
    expect(out.text).toBe(DISCLAIMER_TAIL);
    expect(out.disclaimerAppended).toBe(true);
  });
});

describe('sanitizeExplanation — idempotence (spec §5.5)', () => {
  it.each<[string]>([
    ['Producto con alto contenido de azúcar.'],
    ['No consumir este producto.'],
    ['Producto OK. Recordá que NutriLens es un asistente informativo.'],
    [''],
    ['Es tóxico para celíacos. Consultá a un médico.'],
  ])('sanitize(sanitize(%j)) === sanitize(%j)', (raw) => {
    const once = sanitizeExplanation(raw).text;
    const twice = sanitizeExplanation(once).text;
    expect(twice).toBe(once);
  });

  it('second pass on an already-cleaned text reports no new patterns + no disclaimer append', () => {
    const cleaned = sanitizeExplanation('No consumir. ' + DISCLAIMER_TAIL).text;
    const second = sanitizeExplanation(cleaned);
    expect(second.matchedPatterns).toEqual([]);
    expect(second.disclaimerAppended).toBe(false);
  });
});

describe('sanitizeExplanation — defensive', () => {
  it('trims input', () => {
    const out = sanitizeExplanation('   Producto OK.   ');
    expect(out.text.startsWith('Producto')).toBe(true);
  });

  it('returns the result text without trailing whitespace', () => {
    const out = sanitizeExplanation('Producto OK.\n');
    expect(out.text).toBe(out.text.trim());
  });
});

describe('sanitizeExplanation — disclaimerTail override (E05 §6.1)', () => {
  it('usa el tail provisto cuando el modelo no incluye el disclaimer', () => {
    const out = sanitizeExplanation('Tenés 2 galletitas guardadas.', {
      disclaimerTail: CHAT_DISCLAIMER_TAIL,
    });
    expect(out.text.endsWith(CHAT_DISCLAIMER_TAIL)).toBe(true);
    expect(out.disclaimerAppended).toBe(true);
  });

  it('no agrega el tail override si el needle ya está presente en otro tail', () => {
    // El modelo emite el tail "clásico" de explicación — el needle alcanza,
    // no agregamos el tail del chat encima.
    const out = sanitizeExplanation(
      'Tenés 2 galletitas. Recordá que NutriLens es un asistente informativo.',
      { disclaimerTail: CHAT_DISCLAIMER_TAIL },
    );
    expect(out.text).toContain('Recordá que NutriLens es un asistente informativo.');
    expect(out.text).not.toContain('Basado en productos analizados');
    expect(out.disclaimerAppended).toBe(false);
  });

  it('el tail del chat es idempotente (sanitize(sanitize(x)) === sanitize(x))', () => {
    const once = sanitizeExplanation('No tengo información de eso.', {
      disclaimerTail: CHAT_DISCLAIMER_TAIL,
    }).text;
    const twice = sanitizeExplanation(once, { disclaimerTail: CHAT_DISCLAIMER_TAIL }).text;
    expect(twice).toBe(once);
  });

  it('cuando el raw está vacío, usa el tail del chat como respuesta completa', () => {
    const out = sanitizeExplanation('', { disclaimerTail: CHAT_DISCLAIMER_TAIL });
    expect(out.text).toBe(CHAT_DISCLAIMER_TAIL);
    expect(out.disclaimerAppended).toBe(true);
  });
});
