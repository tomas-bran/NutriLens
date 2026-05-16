/**
 * Integration test del MockIaProvider — valida el contrato del IaProvider
 * y sirve como red de seguridad para el resto de los providers reales
 * cuando se implementen.
 */
import { describe, it, expect } from 'vitest';
import { MockIaProvider } from '@/lib/ai/mock-provider';
import { ProductExtractionSchema, LabelKindSchema } from '@schemas/product';
import type { ProductExtraction } from '@schemas/product';

const provider = new MockIaProvider();
const fakeFile = Buffer.from('fake');
const opts = { promptVersion: 'extract_product-v1' };

describe('MockIaProvider — analyzeLabel', () => {
  it('devuelve un raw JSON que cumple ProductExtractionSchema', async () => {
    const r = await provider.analyzeLabel(fakeFile, 'image/jpeg', opts);
    const parsed = ProductExtractionSchema.safeParse(JSON.parse(r.raw));
    expect(parsed.success).toBe(true);
  });

  it('reporta tokens en 0 (es mock)', async () => {
    const r = await provider.analyzeLabel(fakeFile, 'image/jpeg', opts);
    expect(r.usage.in).toBe(0);
    expect(r.usage.out).toBe(0);
  });

  it('latencyMs es un número >= 0', async () => {
    const r = await provider.analyzeLabel(fakeFile, 'image/jpeg', opts);
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe('MockIaProvider — classifyLabelKind', () => {
  it('devuelve un raw JSON que cumple LabelKindSchema', async () => {
    const r = await provider.classifyLabelKind(fakeFile, 'image/jpeg', opts);
    const parsed = LabelKindSchema.safeParse(JSON.parse(r.raw));
    expect(parsed.success).toBe(true);
  });

  it('por default devuelve is_food_label=true (path feliz para tests)', async () => {
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

  it('devuelve texto con el disclaimer obligatorio', async () => {
    const r = await provider.generateExplanation(product, opts);
    expect(r.raw).toContain('NutriLens es un asistente informativo');
  });
});

describe('MockIaProvider — answerWithContext', () => {
  it('menciona los productos del contexto', async () => {
    const r = await provider.answerWithContext(
      'cualquier pregunta',
      [
        { id: '1', nombre: 'Galletitas A', categoria: 'galletitas', riesgo: 'bajo', alergenos: [], sellos: [] },
        { id: '2', nombre: 'Galletitas B', categoria: 'galletitas', riesgo: 'medio', alergenos: [], sellos: [] },
      ],
      opts,
    );
    expect(r.raw).toContain('Galletitas A');
    expect(r.raw).toContain('Galletitas B');
  });

  it('no rompe cuando el contexto es vacío', async () => {
    const r = await provider.answerWithContext('pregunta', [], opts);
    expect(r.raw).toContain('ninguno');
  });
});
