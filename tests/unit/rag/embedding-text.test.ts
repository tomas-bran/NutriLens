/**
 * Tests del texto canónico de embedding (NL-401) y del embed determinístico
 * del MockIaProvider. El formato del texto es contrato: cambiarlo implica
 * re-embeder el historial completo.
 */
import { describe, expect, it } from 'vitest';
import { buildProductEmbeddingText } from '@/lib/rag/embedding-text';
import { toVectorLiteral, EMBEDDING_DIMS } from '@/lib/rag/vector';
import { MockIaProvider } from '@/lib/ai/mock-provider';

const BASE = {
  nombre: 'Galletitas Avena',
  categoria: 'galletitas',
  ingredientes: ['avena', 'azúcar mascabo'],
  alergenos: ['gluten'],
  sellos: ['exceso en azúcares'],
  aptoVegano: true,
  aptoCeliaco: false,
  aptoSinLactosa: false,
};

describe('buildProductEmbeddingText', () => {
  it('arma el texto canónico con todos los campos', () => {
    const text = buildProductEmbeddingText(BASE);
    expect(text).toBe(
      [
        'Producto: Galletitas Avena',
        'Categoría: galletitas',
        'Ingredientes: avena, azúcar mascabo',
        'Alérgenos: gluten',
        'Sellos de advertencia: exceso en azúcares',
        'Aptitudes: vegano',
      ].join('\n'),
    );
  });

  it('usa placeholders legibles para campos vacíos', () => {
    const text = buildProductEmbeddingText({
      ...BASE,
      ingredientes: [],
      alergenos: [],
      sellos: [],
      aptoVegano: false,
    });
    expect(text).toContain('Ingredientes: sin datos');
    expect(text).toContain('Alérgenos: ninguno');
    expect(text).toContain('Sellos de advertencia: ninguno');
    expect(text).toContain('Aptitudes: ninguna declarada');
  });
});

describe('MockIaProvider.embed', () => {
  const mock = new MockIaProvider();

  it('devuelve 1536 dims normalizadas', async () => {
    const { vector } = await mock.embed('galletitas de avena');
    expect(vector).toHaveLength(EMBEDDING_DIMS);
    const norm = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('es determinístico: mismo texto => mismo vector; distinto texto => distinto', async () => {
    const a1 = await mock.embed('texto A');
    const a2 = await mock.embed('texto A');
    const b = await mock.embed('texto B');
    expect(a1.vector).toEqual(a2.vector);
    expect(a1.vector).not.toEqual(b.vector);
  });
});

describe('toVectorLiteral', () => {
  it('serializa al literal pgvector', () => {
    expect(toVectorLiteral([0.1, -0.2, 3])).toBe('[0.1,-0.2,3]');
  });
});
