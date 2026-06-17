/**
 * Tests del wrapper `generateChatAnswer` — sanitize aplicado, disclaimer del
 * chat, tokens, mapping a SavedProductLite y selección de prompt v1/v2
 * según el intent (US-29 + US-31).
 */
import { describe, it, expect, vi } from 'vitest';
import type { Product as PrismaProduct } from '@prisma/client';
import {
  ANSWER_PROMPT_VERSION_DEFAULT,
  generateChatAnswer,
  pickAnswerPromptVersion,
} from '@/lib/chat/generate-answer';
import { CHAT_DISCLAIMER_TAIL } from '@/lib/ai/sanitize-explanation';
import type { ChatIntent } from '@/lib/chat/intent-schema';
import type { IaProvider, SavedProductLite } from '@/lib/ai/types';

function makeIa(raw: string, usage = { in: 100, out: 50 }, latencyMs = 200) {
  const answerWithContext = vi.fn().mockResolvedValue({ raw, usage, latencyMs });
  return {
    ia: {
      answerWithContext,
      parseIntent: vi.fn(),
      analyzeLabel: vi.fn(),
      classifyLabelKind: vi.fn(),
      generateExplanation: vi.fn(),
    } as unknown as IaProvider,
    answerWithContext,
  };
}

function row(overrides: Partial<PrismaProduct> = {}): PrismaProduct {
  return {
    id: overrides.id ?? 'p1',
    fileHash: 'h',
    nombre: overrides.nombre ?? 'Galletitas X',
    categoria: overrides.categoria ?? 'galletitas',
    ingredientes: '[]',
    alergenos: overrides.alergenos ?? '[]',
    sellos: overrides.sellos ?? '[]',
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: false,
    riesgo: overrides.riesgo ?? 'bajo',
    confidence: 0.9,
    reglasAplicadas: '[]',
    explanation: null,
    jsonRaw: '{}',
    pipelineTrace: '[]',
    imagenPath: '/x.jpg',
    imagenMime: 'image/jpeg',
    imagenBytes: 1024,
    promptVersion: 'extract_product-v1',
    offEnrichment: null,
    createdAt: new Date(),
  };
}

function intent(overrides: Partial<ChatIntent> & { kind: ChatIntent['kind'] }): ChatIntent {
  return {
    kind: overrides.kind,
    categoria: overrides.categoria ?? null,
    riesgo_max: overrides.riesgo_max ?? null,
    apto: overrides.apto ?? null,
    alergeno_excluido: overrides.alergeno_excluido ?? null,
    keywords: overrides.keywords ?? [],
    comparar: overrides.comparar ?? [],
  };
}

const FILTER = intent({ kind: 'filter' });
const COMPARE = intent({ kind: 'compare', comparar: ['Galletitas X', 'Galletitas Y'] });

describe('pickAnswerPromptVersion', () => {
  it('compare → v3 (NL-702: el formato tabla lo activa intent_kind dentro del prompt)', () => {
    expect(pickAnswerPromptVersion(COMPARE)).toBe(ANSWER_PROMPT_VERSION_DEFAULT);
  });

  it('filter → v1 (default)', () => {
    expect(pickAnswerPromptVersion(FILTER)).toBe(ANSWER_PROMPT_VERSION_DEFAULT);
  });

  it('info → v1', () => {
    expect(pickAnswerPromptVersion(intent({ kind: 'info' }))).toBe(ANSWER_PROMPT_VERSION_DEFAULT);
  });

  it('unknown → v1 (defensa: nunca debería invocarse en producción para unknown)', () => {
    expect(pickAnswerPromptVersion(intent({ kind: 'unknown' }))).toBe(
      ANSWER_PROMPT_VERSION_DEFAULT,
    );
  });
});

describe('generateChatAnswer — selección de prompt según intent', () => {
  it('llama al provider con el prompt default (chat_answer-v3) cuando el intent NO es compare', async () => {
    const { ia, answerWithContext } = makeIa('respuesta ok');
    await generateChatAnswer('mostrame galletitas', [row()], FILTER, { ia });
    const [, , opts] = answerWithContext.mock.calls[0] as [
      string,
      unknown,
      { promptVersion: string; extra?: Record<string, string> },
    ];
    expect(opts.promptVersion).toBe(ANSWER_PROMPT_VERSION_DEFAULT);
  });

  it('llama al provider con chat_answer-v3 también cuando intent.kind === "compare"', async () => {
    const { ia, answerWithContext } = makeIa('| col1 | col2 |');
    await generateChatAnswer('comparame X con Y', [row()], COMPARE, { ia });
    const [, , opts] = answerWithContext.mock.calls[0] as [
      string,
      unknown,
      { promptVersion: string; extra?: Record<string, string> },
    ];
    expect(opts.promptVersion).toBe(ANSWER_PROMPT_VERSION_DEFAULT);
  });

  it('reporta promptVersion="chat_answer-v3" en el result cuando es compare', async () => {
    const { ia } = makeIa('| col1 |');
    const r = await generateChatAnswer('q', [row()], COMPARE, { ia });
    expect(r.promptVersion).toBe(ANSWER_PROMPT_VERSION_DEFAULT);
  });

  it('pasa intent.kind en opts.extra para que el prompt v2 lo interpole', async () => {
    const { ia, answerWithContext } = makeIa('ok');
    await generateChatAnswer('q', [row()], COMPARE, { ia });
    const [, , opts] = answerWithContext.mock.calls[0] as [
      string,
      unknown,
      { extra?: Record<string, string> },
    ];
    expect(opts.extra).toMatchObject({ intent_kind: 'compare' });
  });
});

describe('generateChatAnswer — mapping y sanitize (regresión US-29)', () => {
  it('mapea Product[] de Prisma a SavedProductLite[] (categoria con tildes, arrays parseados)', async () => {
    const { ia, answerWithContext } = makeIa('ok');
    await generateChatAnswer(
      'q',
      [
        row({
          id: 'p1',
          categoria: 'sin_tacc',
          alergenos: JSON.stringify(['gluten']),
          sellos: JSON.stringify(['exceso en azúcares']),
        }),
      ],
      FILTER,
      { ia },
    );
    const [, products] = answerWithContext.mock.calls[0] as [string, SavedProductLite[], unknown];
    expect(products[0]).toMatchObject({
      id: 'p1',
      categoria: 'sin TACC',
      alergenos: ['gluten'],
      sellos: ['exceso en azúcares'],
    });
  });

  it('agrega el disclaimer del chat si el modelo no lo emite', async () => {
    const { ia } = makeIa('Tenés 2 galletitas guardadas.');
    const r = await generateChatAnswer('q', [], FILTER, { ia });
    expect(r.text.endsWith(CHAT_DISCLAIMER_TAIL)).toBe(true);
    expect(r.sanitized.disclaimerAppended).toBe(true);
  });

  it('si el modelo ya cerró con disclaimer (variante explanation), no duplica', async () => {
    const { ia } = makeIa('Tenés galletitas. Recordá que NutriLens es un asistente informativo.');
    const r = await generateChatAnswer('q', [], FILTER, { ia });
    expect(r.sanitized.disclaimerAppended).toBe(false);
    expect(r.text).not.toContain('Basado en productos analizados');
  });

  it('reporta tokensIn/tokensOut/latencyMs del provider tal cual', async () => {
    const { ia } = makeIa('ok', { in: 480, out: 120 }, 1234);
    const r = await generateChatAnswer('q', [], FILTER, { ia });
    expect(r.tokensIn).toBe(480);
    expect(r.tokensOut).toBe(120);
    expect(r.latencyMs).toBe(1234);
  });

  it('aplica el blocklist de frases clínicas (heredado de sanitizeExplanation)', async () => {
    const { ia } = makeIa('Consultá a un médico antes de consumir.');
    const r = await generateChatAnswer('q', [], FILTER, { ia });
    expect(r.text).toContain('[texto removido]');
    expect(r.sanitized.matchedPatterns).toContain('consulta_medico');
  });

  it('arrays JSON inválidos en alergenos/sellos no rompen el mapping (caen a [])', async () => {
    const { ia, answerWithContext } = makeIa('ok');
    await generateChatAnswer(
      'q',
      [row({ alergenos: 'corrupto', sellos: 'tambien-corrupto' })],
      FILTER,
      { ia },
    );
    const [, products] = answerWithContext.mock.calls[0] as [string, SavedProductLite[], unknown];
    expect(products[0]!.alergenos).toEqual([]);
    expect(products[0]!.sellos).toEqual([]);
  });
});
