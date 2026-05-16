import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@schemas/errors';
import { apiErrorResponse } from '@/lib/api/error-response';

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiErrorResponse', () => {
  it('maps an ApiError to its httpStatus + structured body + X-Request-Id', async () => {
    const err = new ApiError('file_too_large', 'demasiado grande', 400, { sizeBytes: 99 });
    const res = apiErrorResponse(err, 'req-1');
    expect(res.status).toBe(400);
    expect(res.headers.get('X-Request-Id')).toBe('req-1');
    await expect(res.json()).resolves.toEqual({
      error: 'file_too_large',
      reason: 'demasiado grande',
      details: { sizeBytes: 99 },
    });
  });

  it('maps an unknown Error to 500 internal_error', async () => {
    const res = apiErrorResponse(new Error('boom'), 'req-2');
    expect(res.status).toBe(500);
    expect(res.headers.get('X-Request-Id')).toBe('req-2');
    await expect(res.json()).resolves.toEqual({
      error: 'internal_error',
      reason: 'Error interno del servidor.',
    });
  });

  it('maps a non-Error thrown value to 500 internal_error without crashing', async () => {
    const res = apiErrorResponse('a bare string thrown', 'req-3');
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: 'internal_error' });
  });
});
