import { describe, it, expect } from 'vitest';
import { ApiError, ApiErrorSchema, ERROR_CODES } from '@schemas/errors';

describe('ApiError', () => {
  it('serializes to body with error + reason', () => {
    const e = new ApiError('image_not_supported', 'No parece etiqueta.', 422);
    const body = e.toBody();
    expect(body).toEqual({
      error: 'image_not_supported',
      reason: 'No parece etiqueta.',
    });
  });

  it('includes details when provided', () => {
    const e = new ApiError('file_too_large', 'Excede 10 MB.', 400, {
      sizeBytes: 12 * 1024 * 1024,
    });
    const body = e.toBody();
    expect(body.details).toEqual({ sizeBytes: 12 * 1024 * 1024 });
  });

  it('omits details when not provided', () => {
    const e = new ApiError('empty_file', 'Vacío.', 400);
    expect(e.toBody()).not.toHaveProperty('details');
  });

  it('inherits from Error with the expected name', () => {
    const e = new ApiError('internal_error', 'Boom.', 500);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('ApiError');
    expect(e.message).toContain('internal_error');
  });
});

describe('ApiErrorSchema', () => {
  it('accepts a well-formed body', () => {
    expect(
      ApiErrorSchema.safeParse({ error: 'not_found', reason: 'Producto no encontrado.' }).success,
    ).toBe(true);
  });
  it('rejects an unknown error code', () => {
    expect(ApiErrorSchema.safeParse({ error: 'unknown', reason: 'X' }).success).toBe(false);
  });
  it('rejects an empty reason', () => {
    expect(ApiErrorSchema.safeParse({ error: 'not_found', reason: '' }).success).toBe(false);
  });
});

describe('ERROR_CODES', () => {
  it('includes every code from the spec', () => {
    const expected = [
      'unsupported_file_type',
      'file_too_large',
      'empty_file',
      'pdf_unreadable',
      'image_not_supported',
      'extraction_invalid',
      'model_timeout',
      'model_rate_limited',
      'model_error',
      'invalid_question',
      'invalid_query',
      'not_found',
      'internal_error',
    ];
    expect([...ERROR_CODES].sort()).toEqual(expected.sort());
  });
});
