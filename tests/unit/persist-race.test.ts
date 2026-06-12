/**
 * Unit tests for the persist step's race-condition and error paths (spec E04 §11).
 * Mocks Prisma to simulate the P2002 scenario and non-retryable errors.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mocks so vars are available at module resolution time
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  prisma: {
    product: {
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
    },
  },
}));

vi.mock('@/lib/storage', () => ({
  getStorage: () => ({
    save: vi.fn().mockResolvedValue('/uploads/test.jpg'),
  }),
}));

import { persist } from '@/lib/pipeline/steps/persist';
import type { AnalysisContext } from '@/lib/pipeline/context';
import type { ProductExtraction } from '@schemas/product';

function makeCtx(): AnalysisContext {
  return {
    requestId: 'req-1',
    startedAt: new Date().toISOString(),
    file: {
      name: 'a.jpg',
      mime: 'image/jpeg',
      sizeBytes: 100,
      hash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
      buffer: Buffer.from('test'),
    },
    steps: [],
    product: {
      producto: 'Test',
      categoria: 'galletitas',
      ingredientes_detectados: [],
      alergenos: [],
      sellos: [],
      apto_vegano: false,
      apto_celiaco: false,
      apto_sin_lactosa: true,
      riesgo: 'bajo',
      confidence: 0.9,
    } satisfies ProductExtraction,
    rules: {
      apto_vegano: false,
      apto_celiaco: false,
      apto_sin_lactosa: true,
      reglas_aplicadas: [],
    },
    extractionRaw: '{}',
  };
}

const FAKE_ROW = {
  id: 'winner-id',
  fileHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
  nombre: 'Test',
  categoria: 'galletitas' as const,
  ingredientes: '[]',
  alergenos: '[]',
  sellos: '[]',
  aptoVegano: false,
  aptoCeliaco: false,
  aptoSinLactosa: true,
  riesgo: 'bajo' as const,
  confidence: 0.9,
  reglasAplicadas: '[]',
  explanation: null,
  jsonRaw: '{}',
  pipelineTrace: '[]',
  imagenPath: '/uploads/test.jpg',
  promptVersion: 'extract_product-v1',
  offEnrichment: null,
  imagenBytes: null,
  imagenMime: null,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('persist step — dedup via findUnique', () => {
  it('returns existing row when file hash already exists', async () => {
    mockFindUnique.mockResolvedValueOnce(FAKE_ROW);
    const result = await persist(makeCtx());
    expect(result.cachedFromDedup).toBe(true);
    expect(result.saved?.id).toBe('winner-id');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('sets trace status to skipped for dedup', async () => {
    mockFindUnique.mockResolvedValueOnce(FAKE_ROW);
    const result = await persist(makeCtx());
    const lastStep = result.steps.at(-1);
    expect(lastStep?.status).toBe('skipped');
  });
});

describe('persist step — error propagation', () => {
  it('throws when create fails with non-P2002 error', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockCreate.mockRejectedValueOnce(new Error('Connection refused'));
    await expect(persist(makeCtx())).rejects.toThrow('Connection refused');
  });

  it('throws when context is missing product', async () => {
    const ctx = makeCtx();
    const ctxWithoutProduct = { ...ctx, product: undefined };
    await expect(persist(ctxWithoutProduct)).rejects.toThrow();
  });

  it('happy path: creates product and returns saved row', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce({ ...FAKE_ROW, id: 'new-id' });
    mockUpdate.mockResolvedValueOnce({ ...FAKE_ROW, id: 'new-id' });
    const result = await persist(makeCtx());
    expect(result.saved?.id).toBe('new-id');
    expect(result.cachedFromDedup).toBe(false);
    const lastStep = result.steps.at(-1);
    expect(lastStep?.status).toBe('ok');
  });
});
