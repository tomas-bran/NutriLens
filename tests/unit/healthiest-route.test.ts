/**
 * Tests del endpoint GET /api/products/healthiest (NL-403).
 * El scoring puro vive en health-score.test.ts; acá se cubre la route:
 * que rankee sobre el set completo, la validación de query params y el
 * manejo de errores de DB.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const findManyMock = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: {
    product: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

import { GET } from '@/app/api/products/healthiest/route';

function mkRow(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    nombre: 'Producto',
    categoria: 'galletitas',
    riesgo: 'bajo',
    alergenos: '[]',
    sellos: '[]',
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: false,
    imagenPath: '/img.png',
    createdAt: new Date('2026-01-01'),
    ...over,
  };
}

function req(query = '') {
  return new NextRequest(`http://localhost/api/products/healthiest${query}`);
}

beforeEach(() => {
  findManyMock.mockReset();
});

describe('GET /api/products/healthiest', () => {
  it('rankea sobre el set completo, sin ventana de recencia', async () => {
    // 30 productos recientes de riesgo alto + 1 viejo de riesgo bajo:
    // el viejo tiene que ganar (una ventana por createdAt lo dejaría afuera).
    const rows = Array.from({ length: 30 }, (_, i) =>
      mkRow({ id: `reciente-${i}`, riesgo: 'alto', createdAt: new Date(2026, 4, i + 1) }),
    );
    rows.push(mkRow({ id: 'joya-vieja', riesgo: 'bajo', createdAt: new Date('2025-01-01') }));
    findManyMock.mockResolvedValueOnce(rows);

    const res = await GET(req('?topK=1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.productos[0].id).toBe('joya-vieja');
    // La query no debe limitar el set candidato.
    expect(findManyMock.mock.calls[0]![0]).not.toHaveProperty('take');
  });

  it('topK no entero se trunca en vez de romper la query', async () => {
    findManyMock.mockResolvedValueOnce([
      mkRow({ id: 'a' }),
      mkRow({ id: 'b', createdAt: new Date('2026-02-01') }),
    ]);

    const res = await GET(req('?topK=1.9'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.productos).toHaveLength(1);
  });

  it('categoria inválida devuelve 400 sin tocar la DB', async () => {
    const res = await GET(req('?categoria=juguetes'));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_query');
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('un fallo de DB devuelve 500 mapeado con X-Request-Id', async () => {
    findManyMock.mockRejectedValueOnce(new Error('connection refused'));

    const res = await GET(req());

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('internal_error');
    expect(res.headers.get('X-Request-Id')).toBeTruthy();
  });
});
