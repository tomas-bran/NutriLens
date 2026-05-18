/**
 * Tests del wrapper `parseChatIntent`. Mockeamos `IaProvider.parseIntent` para
 * inyectar respuestas raw y verificar el comportamiento de fallback.
 */
import { describe, it, expect, vi } from 'vitest';
import { parseChatIntent, PARSE_INTENT_PROMPT_VERSION } from '@/lib/chat/parse-intent';
import { UNKNOWN_INTENT } from '@/lib/chat/intent-schema';
import type { IaProvider } from '@/lib/ai/types';

function makeIa(raw: string, usage = { in: 10, out: 5 }, latencyMs = 42): IaProvider {
  return {
    parseIntent: vi.fn().mockResolvedValue({ raw, usage, latencyMs }),
    analyzeLabel: vi.fn(),
    classifyLabelKind: vi.fn(),
    generateExplanation: vi.fn(),
    answerWithContext: vi.fn(),
  } as unknown as IaProvider;
}

describe('parseChatIntent — happy path', () => {
  it('parsea un filter válido y reporta tokens + latencia', async () => {
    const raw = JSON.stringify({
      kind: 'filter',
      categoria: 'galletitas',
      riesgo_max: null,
      apto: 'celiaco',
      alergeno_excluido: null,
      keywords: [],
      comparar: [],
    });
    const ia = makeIa(raw, { in: 80, out: 22 }, 120);

    const r = await parseChatIntent('mostrame galletitas aptas para celíacos', { ia });

    expect(r.intent.kind).toBe('filter');
    expect(r.intent.categoria).toBe('galletitas');
    expect(r.intent.apto).toBe('celiaco');
    expect(r.tokensIn).toBe(80);
    expect(r.tokensOut).toBe(22);
    expect(r.latencyMs).toBe(120);
    expect(r.fellBackToUnknown).toBe(false);
    expect(r.promptVersion).toBe('chat_parse_intent-v1');
  });

  it('usa la versión canónica del prompt al llamar al provider', async () => {
    const ia = makeIa(JSON.stringify({ kind: 'unknown' }));
    await parseChatIntent('x', { ia });
    expect(ia.parseIntent).toHaveBeenCalledWith('x', {
      promptVersion: PARSE_INTENT_PROMPT_VERSION,
    });
  });
});

describe('parseChatIntent — fallback a UNKNOWN_INTENT (resiliente al modelo)', () => {
  it('JSON no parseable → UNKNOWN_INTENT, fellBackToUnknown=true', async () => {
    const ia = makeIa('this is not JSON');
    const r = await parseChatIntent('x', { ia });
    expect(r.intent).toEqual(UNKNOWN_INTENT);
    expect(r.fellBackToUnknown).toBe(true);
  });

  it('JSON con kind inválido → UNKNOWN_INTENT', async () => {
    const ia = makeIa(JSON.stringify({ kind: 'weird', categoria: null }));
    const r = await parseChatIntent('x', { ia });
    expect(r.intent).toEqual(UNKNOWN_INTENT);
    expect(r.fellBackToUnknown).toBe(true);
  });

  it('JSON con categoría fuera del enum → UNKNOWN_INTENT', async () => {
    const ia = makeIa(
      JSON.stringify({
        kind: 'filter',
        categoria: 'helados',
        riesgo_max: null,
        apto: null,
        alergeno_excluido: null,
        keywords: [],
        comparar: [],
      }),
    );
    const r = await parseChatIntent('x', { ia });
    expect(r.intent).toEqual(UNKNOWN_INTENT);
    expect(r.fellBackToUnknown).toBe(true);
  });

  it('JSON vacío → UNKNOWN_INTENT (falta `kind`)', async () => {
    const ia = makeIa('{}');
    const r = await parseChatIntent('x', { ia });
    expect(r.intent).toEqual(UNKNOWN_INTENT);
    expect(r.fellBackToUnknown).toBe(true);
  });
});

describe('parseChatIntent — passthrough de errores del provider', () => {
  it('si el provider tira, parseChatIntent re-lanza (no traga errores del modelo)', async () => {
    const ia = {
      parseIntent: vi.fn().mockRejectedValue(new Error('boom')),
      analyzeLabel: vi.fn(),
      classifyLabelKind: vi.fn(),
      generateExplanation: vi.fn(),
      answerWithContext: vi.fn(),
    } as unknown as IaProvider;
    await expect(parseChatIntent('x', { ia })).rejects.toThrow(/boom/);
  });
});
