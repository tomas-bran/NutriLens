import { describe, it, expect } from 'vitest';
import { ApiError } from '@schemas/errors';
import type { AnalysisContext } from '@/lib/pipeline/context';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
  validate_file,
} from '@/lib/pipeline/steps/validate-file';

const MINIMAL_VALID_PDF = Buffer.from(
  `%PDF-1.0
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 3 3]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000053 00000 n
0000000102 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
158
%%EOF`,
  'utf-8',
);

function makeCtx(overrides: Partial<AnalysisContext['file']>): AnalysisContext {
  const buffer = overrides.buffer ?? Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  return {
    requestId: 'req-123',
    startedAt: new Date().toISOString(),
    file: {
      name: overrides.name ?? 'galletitas.jpg',
      mime: overrides.mime ?? 'image/jpeg',
      sizeBytes: overrides.sizeBytes ?? buffer.length,
      hash: overrides.hash ?? 'a'.repeat(64),
      buffer,
    },
    steps: [],
  };
}

describe('validate_file — happy paths (Escenario 2)', () => {
  it.each(ALLOWED_MIME_TYPES.filter((m) => m !== 'application/pdf'))(
    'accepts a non-PDF file with allowed MIME %s',
    async (mime) => {
      const ctx = makeCtx({ mime });
      const out = await validate_file(ctx);
      expect(out.steps).toHaveLength(1);
      expect(out.steps[0]).toMatchObject({ name: 'validate_file', status: 'ok' });
      expect(out.steps[0]?.details).toMatchObject({ mime, sizeBytes: ctx.file.sizeBytes });
    },
  );

  it('accepts a valid PDF and exercises canReadPdf', async () => {
    const ctx = makeCtx({ mime: 'application/pdf', buffer: MINIMAL_VALID_PDF });
    const out = await validate_file(ctx);
    expect(out.steps[0]?.status).toBe('ok');
  });

  it('appends the trace without dropping previous steps', async () => {
    const ctx = makeCtx({});
    ctx.steps.push({
      name: 'validate_file',
      status: 'skipped',
      startedAt: '2026-05-16T10:00:00.000Z',
      durationMs: 0,
    });
    const out = await validate_file(ctx);
    expect(out.steps).toHaveLength(2);
  });
});

describe('validate_file — error codes (US-08 spec §4.3, US-03)', () => {
  it('throws empty_file when sizeBytes is 0', async () => {
    const ctx = makeCtx({ sizeBytes: 0, buffer: Buffer.alloc(0) });
    await expect(validate_file(ctx)).rejects.toMatchObject({
      code: 'empty_file',
      httpStatus: 400,
    });
  });

  it('throws empty_file when sizeBytes is negative (defensive)', async () => {
    const ctx = makeCtx({ sizeBytes: -1 });
    await expect(validate_file(ctx)).rejects.toMatchObject({ code: 'empty_file' });
  });

  it('throws file_too_large for files just above 10 MB (Escenario 1)', async () => {
    const ctx = makeCtx({ sizeBytes: MAX_FILE_BYTES + 1 });
    await expect(validate_file(ctx)).rejects.toMatchObject({
      code: 'file_too_large',
      httpStatus: 400,
    });
  });

  it('accepts a file exactly at 10 MB boundary', async () => {
    const ctx = makeCtx({ sizeBytes: MAX_FILE_BYTES });
    const out = await validate_file(ctx);
    expect(out.steps[0]?.status).toBe('ok');
  });

  it('throws unsupported_file_type for .docx', async () => {
    const ctx = makeCtx({
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    await expect(validate_file(ctx)).rejects.toMatchObject({
      code: 'unsupported_file_type',
      httpStatus: 400,
    });
  });

  it('throws unsupported_file_type for image/gif', async () => {
    const ctx = makeCtx({ mime: 'image/gif' });
    await expect(validate_file(ctx)).rejects.toMatchObject({ code: 'unsupported_file_type' });
  });

  it('throws unsupported_file_type when mime is empty string', async () => {
    const ctx = makeCtx({ mime: '' });
    await expect(validate_file(ctx)).rejects.toMatchObject({ code: 'unsupported_file_type' });
  });

  it('throws pdf_unreadable when the buffer is corrupt despite mime=pdf', async () => {
    const ctx = makeCtx({
      mime: 'application/pdf',
      buffer: Buffer.from('not actually a pdf'),
    });
    await expect(validate_file(ctx)).rejects.toMatchObject({
      code: 'pdf_unreadable',
      httpStatus: 400,
    });
  });

  it('error instances are ApiError so the route handler can map them', async () => {
    const ctx = makeCtx({ sizeBytes: 0, buffer: Buffer.alloc(0) });
    await expect(validate_file(ctx)).rejects.toBeInstanceOf(ApiError);
  });
});
