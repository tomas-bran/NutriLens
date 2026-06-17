/**
 * Integration test for MockIaProvider — validates the IaProvider contract
 * and acts as a safety net for future real providers when they land.
 */
import { describe, it, expect } from 'vitest';
import { MockIaProvider } from '@/lib/ai/mock-provider';
import { ProductExtractionSchema, LabelKindSchema } from '@schemas/product';
import type { ProductExtraction } from '@schemas/product';

const provider = new MockIaProvider();
const fakeFile = Buffer.from('fake');
const opts = { promptVersion: 'extract_product-v1' };

describe('MockIaProvider — analyzeLabel', () => {
  it('returns a raw JSON that conforms to ProductExtractionSchema', async () => {
    const r = await provider.analyzeLabel(fakeFile, 'image/jpeg', opts);
    const parsed = ProductExtractionSchema.safeParse(JSON.parse(r.raw));
    expect(parsed.success).toBe(true);
  });

  it('reports zero token usage (mock)', async () => {
    const r = await provider.analyzeLabel(fakeFile, 'image/jpeg', opts);
    expect(r.usage.in).toBe(0);
    expect(r.usage.out).toBe(0);
  });

  it('returns a non-negative latencyMs', async () => {
    const r = await provider.analyzeLabel(fakeFile, 'image/jpeg', opts);
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe('MockIaProvider — classifyLabelKind', () => {
  it('returns a raw JSON that conforms to LabelKindSchema', async () => {
    const r = await provider.classifyLabelKind(fakeFile, 'image/jpeg', opts);
    const parsed = LabelKindSchema.safeParse(JSON.parse(r.raw));
    expect(parsed.success).toBe(true);
  });

  it('defaults to is_food_label=true (happy path for tests)', async () => {
    const r = await provider.classifyLabelKind(fakeFile, 'image/jpeg', opts);
    const parsed = LabelKindSchema.parse(JSON.parse(r.raw));
    expect(parsed.is_food_label).toBe(true);
  });
});

describe('MockIaProvider — generateExplanation', () => {
  const product: ProductExtraction = {
    producto: 'X',
    categoria: 'otros',
    ingredientes_detectados: [],
    alergenos: [],
    sellos: [],
    apto_vegano: true,
    apto_celiaco: true,
    apto_sin_lactosa: true,
    riesgo: 'bajo',
    confidence: 0.9,
  };

  it('returns text containing the required disclaimer', async () => {
    const r = await provider.generateExplanation(product, opts);
    expect(r.raw).toContain('NutriLens es un asistente informativo');
  });
});

describe('MockIaProvider — answerWithContext', () => {
  it('mentions context products in the answer', async () => {
    const r = await provider.answerWithContext(
      'cualquier pregunta',
      [
        {
          id: '1',
          nombre: 'Galletitas A',
          categoria: 'galletitas',
          riesgo: 'bajo',
          alergenos: [],
          sellos: [],
          ingredientes: [],
        },
        {
          id: '2',
          nombre: 'Galletitas B',
          categoria: 'galletitas',
          riesgo: 'medio',
          alergenos: [],
          sellos: [],
          ingredientes: [],
        },
      ],
      opts,
    );
    expect(r.raw).toContain('Galletitas A');
    expect(r.raw).toContain('Galletitas B');
  });

  it('does not crash when context is empty', async () => {
    const r = await provider.answerWithContext('pregunta', [], opts);
    expect(r.raw).toContain('ninguno');
  });

  it('chat_title-v1: deriva un título de la primera línea del usuario', async () => {
    const transcript = 'Usuario: ¿Qué galletitas sin gluten tengo?\nNutriLens: Tenés 2.';
    const r = await provider.answerWithContext(transcript, [], {
      promptVersion: 'chat_title-v1',
    });
    expect(r.raw).toBe('¿Qué galletitas sin gluten tengo?');
  });

  it('chat_title-v1: cae a "Consulta general" si no hay línea de usuario', async () => {
    const r = await provider.answerWithContext('NutriLens: hola', [], {
      promptVersion: 'chat_title-v1',
    });
    expect(r.raw).toBe('Consulta general');
  });
});
