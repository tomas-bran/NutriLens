/**
 * @vitest-environment node
 *
 * Integration tests for GET /api/products/[id] — full detail (US-25).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DELETE, GET, PATCH } from '@/app/api/products/[id]/route';
import { isCurrentUserAdmin } from '@/lib/auth/is-admin';

vi.mock('@/lib/auth/is-admin', () => ({ isCurrentUserAdmin: vi.fn() }));
const adminMock = vi.mocked(isCurrentUserAdmin);

const prisma = new PrismaClient();

/** Crea un producto mínimo para los tests de mutación. */
async function seedProduct(nombre = 'Mutable', categoria = 'otros') {
  return prisma.product.create({
    data: {
      fileHash: `h-${Math.random()}`,
      nombre,
      categoria: categoria as never,
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
      imagenPath: '/uploads/m.jpg',
      promptVersion: 'extract_product-v1',
    },
  });
}

function mutateRequest(id: string, method: 'PATCH' | 'DELETE', body?: unknown): Request {
  return new Request(`http://localhost/api/products/${id}`, {
    method,
    ...(body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
}

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

describe('PATCH /api/products/[id] — renombrar (admin)', () => {
  it('admin renombra el producto', async () => {
    adminMock.mockResolvedValue(true);
    const row = await seedProduct('Nombre Viejo');
    const res = await PATCH(
      mutateRequest(row.id, 'PATCH', { nombre: 'Nombre Nuevo' }) as never,
      validParams(row.id) as never,
    );
    expect(res.status).toBe(200);
    const after = await prisma.product.findUnique({ where: { id: row.id } });
    expect(after?.nombre).toBe('Nombre Nuevo');
  });

  it('no-admin → 403 y no cambia el nombre', async () => {
    adminMock.mockResolvedValue(false);
    const row = await seedProduct('Intocable');
    const res = await PATCH(
      mutateRequest(row.id, 'PATCH', { nombre: 'Hackeado' }) as never,
      validParams(row.id) as never,
    );
    expect(res.status).toBe(403);
    const after = await prisma.product.findUnique({ where: { id: row.id } });
    expect(after?.nombre).toBe('Intocable');
  });

  it('nombre vacío → 400', async () => {
    adminMock.mockResolvedValue(true);
    const row = await seedProduct();
    const res = await PATCH(
      mutateRequest(row.id, 'PATCH', { nombre: '   ' }) as never,
      validParams(row.id) as never,
    );
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/products/[id] — soft delete (admin)', () => {
  it('admin hace soft delete: la fila queda con deletedAt y GET da 404', async () => {
    adminMock.mockResolvedValue(true);
    const row = await seedProduct();

    const res = await DELETE(
      mutateRequest(row.id, 'DELETE') as never,
      validParams(row.id) as never,
    );
    expect(res.status).toBe(200);
    // La fila NO se borra (soft delete): sigue existiendo con deletedAt seteado.
    const raw = await prisma.product.findUnique({ where: { id: row.id } });
    expect(raw).not.toBeNull();
    expect(raw?.deletedAt).not.toBeNull();
    // Pero ya no es visible (GET filtra deletedAt: null → 404).
    const getRes = await GET(detailRequest(row.id) as never, validParams(row.id) as never);
    expect(getRes.status).toBe(404);
  });

  it('el conteo "analizados por vos" baja al borrar (deletedAt: null)', async () => {
    adminMock.mockResolvedValue(true);
    const row = await seedProduct();
    await prisma.productAnalysis.create({ data: { userId: 'u-count', productId: row.id } });

    const mine = { analyses: { some: { userId: 'u-count' } }, deletedAt: null };
    expect(await prisma.product.count({ where: mine })).toBe(1);

    await DELETE(mutateRequest(row.id, 'DELETE') as never, validParams(row.id) as never);
    expect(await prisma.product.count({ where: mine })).toBe(0);
  });

  it('no-admin → 403 y el producto sigue activo', async () => {
    adminMock.mockResolvedValue(false);
    const row = await seedProduct();
    const res = await DELETE(
      mutateRequest(row.id, 'DELETE') as never,
      validParams(row.id) as never,
    );
    expect(res.status).toBe(403);
    const raw = await prisma.product.findUnique({ where: { id: row.id } });
    expect(raw?.deletedAt).toBeNull();
  });

  it('id inexistente → 404', async () => {
    adminMock.mockResolvedValue(true);
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await DELETE(
      mutateRequest(fakeId, 'DELETE') as never,
      validParams(fakeId) as never,
    );
    expect(res.status).toBe(404);
  });

  it('borrar dos veces → la segunda da 404 (ya estaba borrado)', async () => {
    adminMock.mockResolvedValue(true);
    const row = await seedProduct();
    const first = await DELETE(
      mutateRequest(row.id, 'DELETE') as never,
      validParams(row.id) as never,
    );
    expect(first.status).toBe(200);
    const second = await DELETE(
      mutateRequest(row.id, 'DELETE') as never,
      validParams(row.id) as never,
    );
    expect(second.status).toBe(404);
  });
});
