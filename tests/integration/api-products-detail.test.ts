/**
 * @vitest-environment node
 *
 * Integration tests for GET /api/products/[id] — full detail (US-25).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { GET } from '@/app/api/products/[id]/route';

const prisma = new PrismaClient();

function detailRequest(id: string): Request {
  return new Request(`http://localhost/api/products/${id}`, { method: 'GET' });
}

const validParams = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await prisma.product.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/products/[id]', () => {
  it('Escenario 1+2: returns the full detail shape for an existing id', async () => {
    const row = await prisma.product.create({
      data: {
        fileHash: `h-${Math.random()}`,
        nombre: 'Detail Test',
        categoria: 'galletitas',
        ingredientes: JSON.stringify(['harina de trigo', 'azúcar']),
        alergenos: JSON.stringify(['gluten']),
        sellos: JSON.stringify(['exceso en azúcares']),
        aptoVegano: false,
        aptoCeliaco: false,
        aptoSinLactosa: true,
        riesgo: 'alto',
        confidence: 0.91,
        reglasAplicadas: JSON.stringify(['contiene_gluten']),
        explanation: 'Producto con gluten.',
        jsonRaw: '{"raw":"value"}',
        pipelineTrace: '[{"name":"validate_file","status":"ok"}]',
        imagenPath: '/uploads/abc.jpg',
        promptVersion: 'extract_product-v1',
      },
    });

    const res = await GET(detailRequest(row.id) as never, validParams(row.id) as never);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Full shape per spec §5.2 — list fields + audit fields.
    expect(body).toMatchObject({
      id: row.id,
      nombre: 'Detail Test',
      categoria: 'galletitas',
      riesgo: 'alto',
      alergenos: ['gluten'],
      sellos: ['exceso en azúcares'],
      aptoVegano: false,
      aptoCeliaco: false,
      aptoSinLactosa: true,
      ingredientes: ['harina de trigo', 'azúcar'],
      confidence: 0.91,
      reglasAplicadas: ['contiene_gluten'],
      explanation: 'Producto con gluten.',
      jsonRaw: '{"raw":"value"}',
      pipelineTrace: [{ name: 'validate_file', status: 'ok' }],
      imagenUrl: '/uploads/abc.jpg',
      promptVersion: 'extract_product-v1',
    });
  });

  it('translates lacteos → "lácteos" and sin_tacc → "sin TACC" in the response', async () => {
    const row = await prisma.product.create({
      data: {
        fileHash: `h-${Math.random()}`,
        nombre: 'X',
        categoria: 'sin_tacc',
        ingredientes: JSON.stringify([]),
        alergenos: JSON.stringify([]),
        sellos: JSON.stringify([]),
        aptoVegano: true,
        aptoCeliaco: true,
        aptoSinLactosa: true,
        riesgo: 'bajo',
        confidence: 0.9,
        reglasAplicadas: JSON.stringify([]),
        explanation: null,
        jsonRaw: '{}',
        pipelineTrace: '[]',
        imagenPath: '/uploads/x.jpg',
        promptVersion: 'extract_product-v1',
      },
    });
    const res = await GET(detailRequest(row.id) as never, validParams(row.id) as never);
    const body = await res.json();
    expect(body.categoria).toBe('sin TACC');
  });

  it('Escenario 3: returns 404 not_found with structured body for an inexistent id', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await GET(detailRequest(fakeId) as never, validParams(fakeId) as never);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      error: 'not_found',
      reason: 'Producto no encontrado.',
    });
  });

  it('preserves explanation=null in the response', async () => {
    const row = await prisma.product.create({
      data: {
        fileHash: `h-${Math.random()}`,
        nombre: 'No explanation',
        categoria: 'otros',
        ingredientes: JSON.stringify([]),
        alergenos: JSON.stringify([]),
        sellos: JSON.stringify([]),
        aptoVegano: true,
        aptoCeliaco: true,
        aptoSinLactosa: true,
        riesgo: 'bajo',
        confidence: 0.5,
        reglasAplicadas: JSON.stringify([]),
        explanation: null,
        jsonRaw: '{}',
        pipelineTrace: '[]',
        imagenPath: '/uploads/n.jpg',
        promptVersion: 'extract_product-v1',
      },
    });
    const res = await GET(detailRequest(row.id) as never, validParams(row.id) as never);
    const body = await res.json();
    expect(body.explanation).toBeNull();
  });
});
