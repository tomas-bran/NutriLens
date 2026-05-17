/**
 * Tests de las respuestas canónicas de fallback (US-30 escenario 1+2 y E05 §8).
 */
import { describe, it, expect } from 'vitest';
import {
  EMPTY_CONTEXT_ANSWER,
  UNKNOWN_INTENT_ANSWER,
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
