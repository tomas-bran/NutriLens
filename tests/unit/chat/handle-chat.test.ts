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
import { EMPTY_CONTEXT_ANSWER } from '@/lib/chat/empty-response';
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
    imagenMime: 'image/jpeg',
    imagenBytes: 1024,
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

describe('handleChat — kind=unknown (smalltalk LLM, refinamiento US-30 §8)', () => {
  it('llama al LLM con prompt smalltalk y devuelve la respuesta conversacional', async () => {
    const { ia, answerWithContext } = makeIa({
      intent: { kind: 'unknown' },
      answerText: '¡Hola! Soy NutriLens, ¿en qué te ayudo?',
    });
    const r = await handleChat('hola', { ia, requestId: 'r1' });
    // Se llamó al LLM exactamente una vez (smalltalk), sin productos en contexto.
    expect(answerWithContext).toHaveBeenCalledTimes(1);
    const [, products, opts] = answerWithContext.mock.calls[0] as [
      string,
      unknown[],
      { promptVersion: string },
    ];
    expect(products).toEqual([]);
    expect(opts.promptVersion).toBe('chat_smalltalk-v1');
    expect(r.answer).toContain('NutriLens');
    expect(r.products).toEqual([]);
    expect(r.fallback).toBeNull();
  });

  it('suma tokens del parser + smalltalk', async () => {
    const { ia } = makeIa({
      intent: { kind: 'unknown' },
      parseTokens: { in: 77, out: 11 },
      answerTokens: { in: 40, out: 30 },
    });
    const r = await handleChat('x', { ia, requestId: 'r1' });
    expect(r.tokensUsed).toEqual({ in: 117, out: 41 });
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

describe('handleChat — compare con ambos productos en DB (US-31 §1)', () => {
  it('llama al LLM con intent compare cuando ambos productos están en el historial', async () => {
    const products = [
      row({ id: 'p1', nombre: 'Galletitas X' }),
      row({ id: 'p2', nombre: 'Galletitas Y' }),
    ];
    const { ia, answerWithContext } = makeIa({
      intent: { kind: 'compare', comparar: ['Galletitas X', 'Galletitas Y'] },
      answerText: '| col | col |',
    });
    const retrieve = vi.fn().mockResolvedValue(products);
    const r = await handleChat('comparame Galletitas X con Galletitas Y', {
      ia,
      requestId: 'r1',
      retrieve,
    });
    expect(answerWithContext).toHaveBeenCalledOnce();
    expect(r.fallback).toBeNull();
    expect(r.intent.kind).toBe('compare');
    expect(r.products).toHaveLength(2);
  });
});

describe('handleChat — compare con producto faltante (US-31 §2 / E05 §13)', () => {
  it('uno de los dos no está → fallback missing_compare SIN llamar al LLM', async () => {
    const products = [row({ id: 'p1', nombre: 'Galletitas X' })];
    const { ia, answerWithContext } = makeIa({
      intent: { kind: 'compare', comparar: ['Galletitas X', 'Cereales Fantasma'] },
    });
    const retrieve = vi.fn().mockResolvedValue(products);
    const r = await handleChat('comparame Galletitas X con Cereales Fantasma', {
      ia,
      requestId: 'r1',
      retrieve,
    });
    expect(answerWithContext).not.toHaveBeenCalled();
    expect(r.fallback?.reason).toBe('missing_compare');
    expect(r.fallback?.showAnalyzeCta).toBe(true);
    expect(r.answer).toContain('"Cereales Fantasma"');
  });

  it('los productos encontrados igualmente vuelven como chips para que el usuario navegue', async () => {
    const products = [row({ id: 'p1', nombre: 'Galletitas X' })];
    const { ia } = makeIa({
      intent: { kind: 'compare', comparar: ['Galletitas X', 'Cereales Fantasma'] },
    });
    const retrieve = vi.fn().mockResolvedValue(products);
    const r = await handleChat('comparame Galletitas X con Cereales Fantasma', {
      ia,
      requestId: 'r1',
      retrieve,
    });
    expect(r.products).toEqual(products);
  });

  it('reporta solo tokens del parser cuando hay faltante (no se gastó answer)', async () => {
    const products = [row({ id: 'p1', nombre: 'Galletitas X' })];
    const { ia } = makeIa({
      intent: { kind: 'compare', comparar: ['Galletitas X', 'No Existe'] },
      parseTokens: { in: 60, out: 18 },
    });
    const retrieve = vi.fn().mockResolvedValue(products);
    const r = await handleChat('q', { ia, requestId: 'r1', retrieve });
    expect(r.tokensUsed).toEqual({ in: 60, out: 18 });
  });
});

describe('handleChat — compare degenerado (caso borde E05 §13)', () => {
  it('kind=compare con 1 solo producto → normalizamos a info con keywords y seguimos el flow normal', async () => {
    const products = [row({ id: 'p1', nombre: 'Galletitas X' })];
    const { ia, answerWithContext } = makeIa({
      intent: { kind: 'compare', comparar: ['Galletitas X'] },
      answerText: 'Tenés una galletita con ese nombre.',
    });
    const retrieve = vi.fn().mockResolvedValue(products);
    const r = await handleChat('comparame Galletitas X', { ia, requestId: 'r1', retrieve });
    // Tras la normalización, intent.kind === 'info' y comparar=[].
    expect(r.intent.kind).toBe('info');
    expect(r.intent.comparar).toEqual([]);
    expect(r.intent.keywords).toContain('Galletitas X');
    // Y como retrieve devolvió 1 producto, se llamó al LLM como info normal.
    expect(answerWithContext).toHaveBeenCalledOnce();
  });

  it('kind=compare con 0 productos → normalizamos a info SIN keywords (no hay nada que buscar)', async () => {
    const { ia, answerWithContext } = makeIa({
      intent: { kind: 'compare', comparar: [] },
    });
    const retrieve = vi.fn().mockResolvedValue([]);
    const r = await handleChat('comparar nada', { ia, requestId: 'r1', retrieve });
    expect(r.intent.kind).toBe('info');
    expect(r.fallback?.reason).toBe('no_context');
    expect(answerWithContext).not.toHaveBeenCalled();
  });
});
