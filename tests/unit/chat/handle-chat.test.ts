/**
 * Tests del orchestrator `handleChat`. Mockeamos el provider y el retrieve
 * para cubrir cada branch del pipeline en aislamiento. Cubre los ACs de:
 *
 *   - US-28 §1-§3 (retrieval por filtros / keywords / ranking).
 *   - US-29 §1 (respuesta con contexto + tokens reportados).
 *   - US-30 §1 (retrieve vacío → fallback sin llamar al LLM de generación).
 *   - US-30 §2 (CTA "Analizar nuevo producto").
 *   - E05 §8 (intent unknown).
 *   - E05 §13 (pregunta vacía + truncamiento a 500 chars).
 */
import { describe, it, expect, vi } from 'vitest';
import type { Product as PrismaProduct } from '@prisma/client';
import { ApiError } from '@schemas/errors';
import { handleChat } from '@/lib/chat/handle-chat';
import { EMPTY_CONTEXT_ANSWER, UNKNOWN_INTENT_ANSWER } from '@/lib/chat/empty-response';
import type { ChatIntent } from '@/lib/chat/intent-schema';
import type { IaProvider } from '@/lib/ai/types';

function row(overrides: Partial<PrismaProduct> = {}): PrismaProduct {
  return {
    id: overrides.id ?? 'p1',
    fileHash: 'h',
    nombre: overrides.nombre ?? 'Galletitas A',
    categoria: overrides.categoria ?? 'galletitas',
    ingredientes: '[]',
    alergenos: '[]',
    sellos: '[]',
    aptoVegano: false,
    aptoCeliaco: overrides.aptoCeliaco ?? true,
    aptoSinLactosa: false,
    riesgo: 'bajo',
    confidence: 0.9,
    reglasAplicadas: '[]',
    explanation: null,
    jsonRaw: '{}',
    pipelineTrace: '[]',
    imagenPath: '/x.jpg',
    promptVersion: 'extract_product-v1',
    createdAt: new Date(),
  };
}

function makeIa(opts: {
  intent: Partial<ChatIntent> & { kind: ChatIntent['kind'] };
  parseTokens?: { in: number; out: number };
  parseLatency?: number;
  answerText?: string;
  answerTokens?: { in: number; out: number };
  answerLatency?: number;
}) {
  const fullIntent: ChatIntent = {
    kind: opts.intent.kind,
    categoria: opts.intent.categoria ?? null,
    riesgo_max: opts.intent.riesgo_max ?? null,
    apto: opts.intent.apto ?? null,
    alergeno_excluido: opts.intent.alergeno_excluido ?? null,
    keywords: opts.intent.keywords ?? [],
    comparar: opts.intent.comparar ?? [],
  };
  const parseIntent = vi.fn().mockResolvedValue({
    raw: JSON.stringify(fullIntent),
    usage: opts.parseTokens ?? { in: 50, out: 20 },
    latencyMs: opts.parseLatency ?? 100,
  });
  const answerWithContext = vi.fn().mockResolvedValue({
    raw: opts.answerText ?? 'Respuesta mock.',
    usage: opts.answerTokens ?? { in: 200, out: 80 },
    latencyMs: opts.answerLatency ?? 300,
  });
  return {
    ia: {
      parseIntent,
      answerWithContext,
      analyzeLabel: vi.fn(),
      classifyLabelKind: vi.fn(),
      generateExplanation: vi.fn(),
    } as unknown as IaProvider,
    parseIntent,
    answerWithContext,
  };
}

describe('handleChat — validación de input (caso borde §13)', () => {
  it('pregunta vacía → ApiError invalid_question 400', async () => {
    const { ia } = makeIa({ intent: { kind: 'unknown' } });
    await expect(handleChat('', { ia, requestId: 'r1' })).rejects.toBeInstanceOf(ApiError);
  });

  it('pregunta solo whitespace → ApiError invalid_question 400', async () => {
    const { ia } = makeIa({ intent: { kind: 'unknown' } });
    await expect(handleChat('   \n\t ', { ia, requestId: 'r1' })).rejects.toMatchObject({
      code: 'invalid_question',
      httpStatus: 400,
    });
  });

  it('pregunta de tipo no-string → ApiError invalid_question', async () => {
    const { ia } = makeIa({ intent: { kind: 'unknown' } });
    await expect(
      handleChat(123 as unknown as string, { ia, requestId: 'r1' }),
    ).rejects.toMatchObject({ code: 'invalid_question' });
  });

  it('pregunta > 500 chars: la corta antes de mandarla al parser', async () => {
    const longQ = 'a'.repeat(700);
    const { ia, parseIntent } = makeIa({ intent: { kind: 'unknown' } });
    const r = await handleChat(longQ, { ia, requestId: 'r1' });
    expect(r.questionWasTruncated).toBe(true);
    const [questionSentToParser] = parseIntent.mock.calls[0] as [string, unknown];
    expect(questionSentToParser.length).toBe(500);
  });
});

describe('handleChat — kind=unknown (US-30 unknown branch, E05 §8)', () => {
  it('NO llama al LLM de generación, devuelve fallback canónico + showAnalyzeCta=false', async () => {
    const { ia, answerWithContext } = makeIa({ intent: { kind: 'unknown' } });
    const r = await handleChat('contame un chiste', { ia, requestId: 'r1' });
    expect(answerWithContext).not.toHaveBeenCalled();
    expect(r.answer).toBe(UNKNOWN_INTENT_ANSWER);
    expect(r.products).toEqual([]);
    expect(r.fallback?.reason).toBe('unknown_intent');
    expect(r.fallback?.showAnalyzeCta).toBe(false);
  });

  it('reporta solo los tokens del parser cuando hay unknown (no se gastó answer)', async () => {
    const { ia } = makeIa({
      intent: { kind: 'unknown' },
      parseTokens: { in: 77, out: 11 },
    });
    const r = await handleChat('x', { ia, requestId: 'r1' });
    expect(r.tokensUsed).toEqual({ in: 77, out: 11 });
  });
});

describe('handleChat — retrieve vacío (US-30 §1 + §2)', () => {
  it('NO llama al LLM de generación, devuelve fallback canónico', async () => {
    const { ia, answerWithContext } = makeIa({
      intent: { kind: 'filter', categoria: 'galletitas' },
    });
    const retrieve = vi.fn().mockResolvedValue([]);
    const r = await handleChat('mostrame galletitas', {
      ia,
      requestId: 'r1',
      retrieve,
    });
    expect(answerWithContext).not.toHaveBeenCalled();
    expect(r.answer).toBe(EMPTY_CONTEXT_ANSWER);
    expect(r.products).toEqual([]);
  });

  it('expone showAnalyzeCta=true cuando el retrieve es vacío (US-30 §2)', async () => {
    const { ia } = makeIa({ intent: { kind: 'filter', categoria: 'galletitas' } });
    const retrieve = vi.fn().mockResolvedValue([]);
    const r = await handleChat('mostrame galletitas', {
      ia,
      requestId: 'r1',
      retrieve,
    });
    expect(r.fallback?.reason).toBe('no_context');
    expect(r.fallback?.showAnalyzeCta).toBe(true);
  });

  it('reporta solo tokens del parser cuando el retrieve es vacío', async () => {
    const { ia } = makeIa({
      intent: { kind: 'filter' },
      parseTokens: { in: 60, out: 18 },
    });
    const retrieve = vi.fn().mockResolvedValue([]);
    const r = await handleChat('q', { ia, requestId: 'r1', retrieve });
    expect(r.tokensUsed).toEqual({ in: 60, out: 18 });
  });
});

describe('handleChat — happy path con contexto (US-29 §1 + US-32 §1)', () => {
  it('llama al generate con los rows recuperados y devuelve respuesta saneada', async () => {
    const products = [row({ id: 'p1' }), row({ id: 'p2', nombre: 'Galletitas B' })];
    const { ia, answerWithContext } = makeIa({
      intent: { kind: 'filter', categoria: 'galletitas', apto: 'celiaco' },
      answerText: 'Tenés 2 galletitas aptas para celíacos.',
      answerTokens: { in: 480, out: 120 },
    });
    const retrieve = vi.fn().mockResolvedValue(products);
    const r = await handleChat('mostrame galletitas aptas para celíacos', {
      ia,
      requestId: 'r1',
      retrieve,
    });
    expect(answerWithContext).toHaveBeenCalledOnce();
    expect(r.products).toEqual(products);
    expect(r.fallback).toBeNull();
    expect(r.answer).toContain('Tenés 2 galletitas');
    // disclaimer del chat agregado al final si no estaba
    expect(r.answer).toContain('NutriLens es un asistente informativo');
  });

  it('tokensUsed = SUMA de parse + answer (decisión de medir el gasto real)', async () => {
    const products = [row()];
    const { ia } = makeIa({
      intent: { kind: 'filter' },
      parseTokens: { in: 50, out: 10 },
      answerTokens: { in: 400, out: 100 },
    });
    const retrieve = vi.fn().mockResolvedValue(products);
    const r = await handleChat('mostrame algo', { ia, requestId: 'r1', retrieve });
    expect(r.tokensUsed).toEqual({ in: 450, out: 110 });
  });

  it('pasa el intent parseado al retrieve (no lo modifica)', async () => {
    const products = [row()];
    const { ia } = makeIa({
      intent: { kind: 'filter', categoria: 'galletitas', apto: 'celiaco' },
    });
    const retrieve = vi.fn().mockResolvedValue(products);
    await handleChat('mostrame galletitas aptas para celíacos', {
      ia,
      requestId: 'r1',
      retrieve,
    });
    const [intentArg] = retrieve.mock.calls[0] as [ChatIntent];
    expect(intentArg.kind).toBe('filter');
    expect(intentArg.categoria).toBe('galletitas');
    expect(intentArg.apto).toBe('celiaco');
  });
});

describe('handleChat — errores del provider', () => {
  it('si el answer tira, propaga el error (la route lo mapea a model_error/timeout)', async () => {
    const products = [row()];
    const { ia, answerWithContext } = makeIa({ intent: { kind: 'filter' } });
    answerWithContext.mockRejectedValue(new Error('boom'));
    const retrieve = vi.fn().mockResolvedValue(products);
    await expect(handleChat('q', { ia, requestId: 'r1', retrieve })).rejects.toThrow(/boom/);
  });
});
