/**
 * Tests de las respuestas canónicas de fallback (US-30 escenario 1+2 y E05 §8).
 */
import { describe, it, expect } from 'vitest';
import {
  EMPTY_CONTEXT_ANSWER,
  UNKNOWN_INTENT_ANSWER,
  missingCompareFallback,
  noContextFallback,
  unknownIntentFallback,
} from '@/lib/chat/empty-response';

describe('chat empty-response — sin contexto (US-30)', () => {
  it('noContextFallback usa la copia exacta del spec §7', () => {
    expect(noContextFallback().answer).toBe(EMPTY_CONTEXT_ANSWER);
  });

  it('noContextFallback sugiere CTA "Analizar nuevo producto" (US-30 §2)', () => {
    expect(noContextFallback().showAnalyzeCta).toBe(true);
  });

  it('noContextFallback reporta reason="no_context"', () => {
    expect(noContextFallback().reason).toBe('no_context');
  });
});

describe('chat empty-response — intent unknown (E05 §8)', () => {
  it('unknownIntentFallback usa la copia exacta del spec', () => {
    expect(unknownIntentFallback().answer).toBe(UNKNOWN_INTENT_ANSWER);
  });

  it('unknownIntentFallback NO muestra el CTA de analizar (la pregunta no fue interpretada)', () => {
    expect(unknownIntentFallback().showAnalyzeCta).toBe(false);
  });

  it('unknownIntentFallback reporta reason="unknown_intent"', () => {
    expect(unknownIntentFallback().reason).toBe('unknown_intent');
  });
});

describe('chat empty-response — compare con producto faltante (US-31 §2 + E05 §13)', () => {
  it('missingCompareFallback con 1 nombre → answer singular + CTA', () => {
    const fb = missingCompareFallback(['Galletitas Choco']);
    expect(fb.reason).toBe('missing_compare');
    expect(fb.showAnalyzeCta).toBe(true);
    expect(fb.answer).toContain('"Galletitas Choco"');
    expect(fb.answer).toContain('analizar');
    expect(fb.missingProducts).toEqual(['Galletitas Choco']);
  });

  it('missingCompareFallback con 2 nombres → answer plural lista ambos', () => {
    const fb = missingCompareFallback(['Galletitas X', 'Cereales Y']);
    expect(fb.answer).toContain('"Galletitas X"');
    expect(fb.answer).toContain('"Cereales Y"');
    expect(fb.missingProducts).toEqual(['Galletitas X', 'Cereales Y']);
  });

  it('missingCompareFallback con 0 nombres NO debería invocarse en producción (defensa)', () => {
    // Si el caller llamó con [], el answer queda vacío pero la shape es válida.
    const fb = missingCompareFallback([]);
    expect(fb.answer).toBe('');
    expect(fb.missingProducts).toEqual([]);
  });
});
