/**
 * Tests del wrapper `generateChatAnswer` — sanitize aplicado, disclaimer del
 * chat, tokens y mapping a SavedProductLite.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Product as PrismaProduct } from '@prisma/client';
import { generateChatAnswer, ANSWER_PROMPT_VERSION } from '@/lib/chat/generate-answer';
import { CHAT_DISCLAIMER_TAIL } from '@/lib/ai/sanitize-explanation';
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
    promptVersion: 'extract_product-v1',
    createdAt: new Date(),
  };
}

describe('generateChatAnswer', () => {
  it('llama al provider con la versión chat_answer-v1', async () => {
    const { ia, answerWithContext } = makeIa('respuesta ok');
    await generateChatAnswer('mostrame galletitas', [row()], { ia });
    expect(answerWithContext).toHaveBeenCalledOnce();
    const [, , opts] = answerWithContext.mock.calls[0] as [
      string,
      unknown,
      { promptVersion: string },
    ];
    expect(opts.promptVersion).toBe(ANSWER_PROMPT_VERSION);
  });

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
    const r = await generateChatAnswer('q', [], { ia });
    expect(r.text.endsWith(CHAT_DISCLAIMER_TAIL)).toBe(true);
    expect(r.sanitized.disclaimerAppended).toBe(true);
  });

  it('si el modelo ya cerró con disclaimer (variante explanation), no duplica', async () => {
    const { ia } = makeIa('Tenés galletitas. Recordá que NutriLens es un asistente informativo.');
    const r = await generateChatAnswer('q', [], { ia });
    expect(r.sanitized.disclaimerAppended).toBe(false);
    expect(r.text).not.toContain('Basado en productos analizados');
  });

  it('reporta tokensIn/tokensOut/latencyMs del provider tal cual', async () => {
    const { ia } = makeIa('ok', { in: 480, out: 120 }, 1234);
    const r = await generateChatAnswer('q', [], { ia });
    expect(r.tokensIn).toBe(480);
    expect(r.tokensOut).toBe(120);
    expect(r.latencyMs).toBe(1234);
  });

  it('aplica el blocklist de frases clínicas (heredado de sanitizeExplanation)', async () => {
    const { ia } = makeIa('Consultá a un médico antes de consumir.');
    const r = await generateChatAnswer('q', [], { ia });
    expect(r.text).toContain('[texto removido]');
    expect(r.sanitized.matchedPatterns).toContain('consulta_medico');
  });

  it('arrays JSON inválidos en alergenos/sellos no rompen el mapping (caen a [])', async () => {
    const { ia, answerWithContext } = makeIa('ok');
    await generateChatAnswer('q', [row({ alergenos: 'corrupto', sellos: 'tambien-corrupto' })], {
      ia,
    });
    const [, products] = answerWithContext.mock.calls[0] as [string, SavedProductLite[], unknown];
    expect(products[0]!.alergenos).toEqual([]);
    expect(products[0]!.sellos).toEqual([]);
  });
});
