/**
 * @vitest-environment node
 *
 * Integration tests for POST /api/chat — pipeline completo del chat RAG.
 * Spec: `docs/specs/E05-chat-rag.md §11`.
 *
 * Usamos MockIaProvider (heurística regex) + DB Postgres real (la misma que
 * usa el resto de la suite integration). No consume tokens.
 *
 * Cubrimos los AC de:
 *   - US-28 §1+§2+§4 (retrieval por filtros + alergeno + sin productos).
 *   - US-29 §1+§2+§3 (respuesta basada en contexto, disclaimer, prompt versionado).
 *   - US-30 §1+§2 (caso sin productos relevantes + CTA).
 *   - US-32 §1+§3 (chips referenciados, sección oculta si no hay).
 *   - E05 §13 (pregunta vacía → invalid_question).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient, type Prisma } from '@prisma/client';

// La route resuelve las prefs del usuario vía getUserId (→ @/lib/auth →
// next-auth → next/server, que el env de test no resuelve). Sin sesión en
// integración, mockeamos getUserId a null (sin prefs); el resto es real.
vi.mock('@/lib/auth/current-user', () => ({
  getUserId: vi.fn().mockResolvedValue(null),
}));

import { POST } from '@/app/api/chat/route';

const prisma = new PrismaClient();

function seedRow(overrides: Partial<Prisma.ProductCreateInput> = {}): Prisma.ProductCreateInput {
  return {
    fileHash: `h-${Math.random().toString(36).slice(2)}-${Date.now()}-${Math.random()}`,
    nombre: 'Seed Product',
    categoria: 'galletitas',
    ingredientes: JSON.stringify(['harina']),
    alergenos: JSON.stringify([]),
    sellos: JSON.stringify([]),
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: false,
    riesgo: 'bajo',
    confidence: 0.9,
    reglasAplicadas: JSON.stringify([]),
    explanation: null,
    jsonRaw: '{}',
    pipelineTrace: '[]',
    imagenPath: '/uploads/seed.jpg',
    promptVersion: 'extract_product-v1',
    ...overrides,
  };
}

function chatRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

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

describe('POST /api/chat — validación de input (caso borde §13)', () => {
  it('body sin question → 400 invalid_question', async () => {
    const res = await POST(chatRequest({}) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_question');
  });

  it('question vacío → 400 invalid_question', async () => {
    const res = await POST(chatRequest({ question: '' }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_question');
  });

  it('question solo whitespace → 400 invalid_question', async () => {
    const res = await POST(chatRequest({ question: '   \n  ' }) as never);
    expect(res.status).toBe(400);
  });

  it('body no-JSON → 400 invalid_question', async () => {
    const res = await POST(chatRequest('not-json') as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_question');
  });

  it('echa el X-Request-Id provisto en headers', async () => {
    const rid = '11111111-2222-3333-4444-555555555555';
    const res = await POST(chatRequest({ question: 'hola' }, { 'x-request-id': rid }) as never);
    expect(res.headers.get('x-request-id')).toBe(rid);
  });
});

describe('POST /api/chat — DB vacía (US-30 §1)', () => {
  it('devuelve respuesta de "no tengo productos" + products[] vacío + CTA', async () => {
    const res = await POST(
      chatRequest({ question: 'mostrame galletitas aptas para celíacos' }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toEqual([]);
    expect(body.answer).toContain('No tengo productos guardados');
    expect(body.fallback).toEqual({
      answer: expect.any(String),
      reason: 'no_context',
      showAnalyzeCta: true,
    });
  });
});

describe('POST /api/chat — DB seedeada con galletitas aptas celíacos (US-28 §1 + US-29 §1 + US-32 §1)', () => {
  it('"galletitas aptas para celíacos" devuelve solo las aptas y el chip referencia los productos', async () => {
    await prisma.product.create({
      data: seedRow({ nombre: 'Galletitas Sin TACC X', aptoCeliaco: true }),
    });
    await prisma.product.create({
      data: seedRow({ nombre: 'Galletitas Comunes Y', aptoCeliaco: false }),
    });
    await prisma.product.create({
      data: seedRow({ nombre: 'Galletitas de Arroz Z', aptoCeliaco: true }),
    });

    const res = await POST(
      chatRequest({ question: 'mostrame galletitas aptas para celíacos' }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.products).toHaveLength(2);
    const names = body.products.map((p: { nombre: string }) => p.nombre).sort();
    expect(names).toEqual(['Galletitas Sin TACC X', 'Galletitas de Arroz Z'].sort());

    // El chip de US-32 §1 trae lo justo y necesario.
    for (const p of body.products) {
      expect(p).toMatchObject({
        id: expect.any(String),
        nombre: expect.any(String),
        riesgo: expect.any(String),
        imagenUrl: expect.any(String),
        categoria: expect.any(String),
      });
    }

    // Disclaimer obligatorio (US-29 §2).
    expect(body.answer).toContain('NutriLens es un asistente informativo');
    // Sin fallback cuando hay contexto.
    expect(body.fallback).toBeNull();
    // Intent visible (US-29 §3 — prompt versionado, trazabilidad).
    expect(body.intent.kind).toBe('filter');
    expect(body.intent.apto).toBe('celiaco');
    expect(body.intent.categoria).toBe('galletitas');
  });
});

describe('POST /api/chat — alérgeno en el query (US-28 §2)', () => {
  it('"qué productos tengo con leche" trae solo los que tienen "leche" en alergenos', async () => {
    await prisma.product.create({
      data: seedRow({
        nombre: 'Yogur con leche',
        alergenos: JSON.stringify(['leche']),
        categoria: 'lacteos',
      }),
    });
    await prisma.product.create({
      data: seedRow({ nombre: 'Galletitas sin alérgenos', alergenos: JSON.stringify([]) }),
    });

    const res = await POST(chatRequest({ question: 'qué productos tengo con leche' }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(1);
    expect(body.products[0].nombre).toBe('Yogur con leche');
    expect(body.intent.kind).toBe('info');
  });
});

describe('POST /api/chat — caso unknown (smalltalk LLM)', () => {
  it('pregunta absurda → LLM smalltalk responde conversacional sin tocar productos', async () => {
    // Seedeamos algo para verificar que NO viene en el response.
    await prisma.product.create({ data: seedRow() });

    const res = await POST(chatRequest({ question: 'contame un chiste' }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.intent.kind).toBe('unknown');
    expect(body.products).toEqual([]);
    // El MockIaProvider devuelve un texto fijo para answerWithContext;
    // sólo verificamos que es un string no-vacío y no el fallback canned.
    expect(typeof body.answer).toBe('string');
    expect(body.answer.length).toBeGreaterThan(0);
    expect(body.fallback).toBeNull();
  });
});

describe('POST /api/chat — tokens reportados (decisión Federico: medir gasto real)', () => {
  it('responde con tokensUsed sumando parser + answer cuando hay contexto', async () => {
    await prisma.product.create({
      data: seedRow({ nombre: 'Galletitas X', aptoCeliaco: true }),
    });
    const res = await POST(
      chatRequest({ question: 'mostrame galletitas aptas para celíacos' }) as never,
    );
    const body = await res.json();
    // MockIaProvider reporta {in:0, out:0}, así que la suma es 0.
    // El shape igual debe estar presente para el día que enchufemos Foundry.
    expect(body.tokensUsed).toEqual({ in: expect.any(Number), out: expect.any(Number) });
  });
});

describe('POST /api/chat — chips ocultos cuando no hay contexto (US-32 §3)', () => {
  it('en fallback los products = [] (la UI esconde la sección)', async () => {
    const res = await POST(chatRequest({ question: 'mostrame snacks' }) as never);
    const body = await res.json();
    expect(body.products).toEqual([]);
  });
});

describe('POST /api/chat — compare con ambos productos en DB (US-31 §1)', () => {
  it('"comparame Galletitas X con Galletitas Y" trae ambos y devuelve respuesta con intent compare', async () => {
    await prisma.product.create({
      data: seedRow({ nombre: 'Galletitas X', riesgo: 'bajo' }),
    });
    await prisma.product.create({
      data: seedRow({
        nombre: 'Galletitas Y',
        riesgo: 'medio',
        alergenos: JSON.stringify(['gluten']),
      }),
    });

    const res = await POST(
      chatRequest({ question: 'comparame Galletitas X con Galletitas Y' }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.intent.kind).toBe('compare');
    expect(body.intent.comparar).toEqual(['Galletitas X', 'Galletitas Y']);
    expect(body.products).toHaveLength(2);
    expect(body.fallback).toBeNull();
    // El MockIaProvider devuelve un string canned; confirmamos solo que el
    // disclaimer del chat está presente (el formato real de tabla lo prueba
    // el provider real + tests del prompt v2).
    expect(body.answer).toContain('NutriLens es un asistente informativo');
  });
});

describe('POST /api/chat — compare con producto faltante (US-31 §2 / E05 §13)', () => {
  it('uno de los nombres no está en DB → mensaje específico "no tengo X guardado" + CTA', async () => {
    await prisma.product.create({
      data: seedRow({ nombre: 'Galletitas X', riesgo: 'bajo' }),
    });

    const res = await POST(
      chatRequest({ question: 'comparame Galletitas X con Cereales Fantasma' }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.intent.kind).toBe('compare');
    expect(body.fallback?.reason).toBe('missing_compare');
    expect(body.fallback?.showAnalyzeCta).toBe(true);
    expect(body.answer).toContain('"Cereales Fantasma"');
    expect(body.answer).toContain('analizar');
    // El producto que SÍ está aparece como chip para navegación.
    expect(body.products).toHaveLength(1);
    expect(body.products[0].nombre).toBe('Galletitas X');
  });

  it('ninguno de los dos nombres está en DB → fallback no_context (el retrieve viene vacío)', async () => {
    const res = await POST(
      chatRequest({
        question: 'comparame Producto Ghost con Otro Ghost',
      }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.intent.kind).toBe('compare');
    expect(body.fallback?.reason).toBe('no_context');
    expect(body.products).toEqual([]);
  });
});

describe('POST /api/chat — compare degenerado normalizado a info (E05 §13)', () => {
  it('"comparame Galletitas X" (un solo nombre) → kind se normaliza a info', async () => {
    await prisma.product.create({
      data: seedRow({ nombre: 'Galletitas X' }),
    });
    // El mock heurístico no matchea "comparame X" como compare (necesita "con Y"),
    // así que esto entra como filter/info según la heurística. El test confirma
    // que el handler NO devuelve kind=compare en este caso.
    const res = await POST(chatRequest({ question: 'comparame Galletitas X' }) as never);
    const body = await res.json();
    expect(body.intent.kind).not.toBe('compare');
  });
});
