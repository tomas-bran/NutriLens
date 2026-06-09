/**
 * @vitest-environment node
 *
 * Integration tests for `POST /api/analyze` (US-08 + US-03).
 *
 * Exercises the route handler end-to-end (multipart parsing, header handling,
 * validate_file invocation, structured error mapping, upload.received log).
 * The IA pipeline is intentionally not wired yet — these tests assert the
 * placeholder 200 shape from spec E01 §4.2 with `product: null`.
 *
 * Forced to the `node` environment because happy-dom's Request.formData()
 * roundtrip strips empty file parts (breaking the empty_file integration
 * test) and because the route uses Node-only crypto + pdf-parse anyway.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APIConnectionTimeoutError, APIError } from 'openai';
import { PrismaClient } from '@prisma/client';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { POST } from '@/app/api/analyze/route';
import { MockIaProvider, getIaProvider, _resetIaProvider } from '@/lib/ai';
import { cache } from '@/lib/cache';
import type { IaCallResult } from '@/lib/ai/types';
import { mapProviderError } from '@/lib/ai/foundry-provider';

const prisma = new PrismaClient();
const UPLOADS_DIR = resolve(process.cwd(), 'uploads');

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

const SHA256_HEX_RE = /^[0-9a-f]{64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface FetchOpts {
  filename?: string;
  mime?: string;
  body?: Buffer;
  headers?: Record<string, string>;
  withFile?: boolean;
}

function makeRequest(opts: FetchOpts = {}): Request {
  const formData = new FormData();
  if (opts.withFile !== false) {
    // `new File()` (Node 20+) preserves type + name even with 0-byte content,
    // which `new Blob() + formData.append(filename)` does not.
    const bytes = new Uint8Array(opts.body ?? Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    const file = new File([bytes], opts.filename ?? 'galletitas.jpg', {
      type: opts.mime ?? 'image/jpeg',
    });
    formData.append('file', file);
  }
  return new Request('http://localhost/api/analyze', {
    method: 'POST',
    body: formData,
    headers: opts.headers,
  });
}

// Silence + capture logger writes. Re-spied per test so assertions stay isolated.
function installWriteSpy(stream: NodeJS.WriteStream) {
  return vi.spyOn(stream, 'write').mockImplementation(() => true);
}
type WriteSpy = ReturnType<typeof installWriteSpy>;
let stdoutWrite: WriteSpy;
let stderrWrite: WriteSpy;

beforeEach(() => {
  stdoutWrite = installWriteSpy(process.stdout);
  stderrWrite = installWriteSpy(process.stderr);
  cache.clear();
  _resetIaProvider();
  process.env.IA_PROVIDER = 'mock';
  // El step `enrich_with_off` golpea la API pública de Open Food Facts.
  // En tests integration agrega ~3s por request y rompe los 5s de timeout
  // default cuando el runner está bajo carga (Vitest paralelo). El feature
  // tiene cobertura propia en unit tests, así que lo desactivamos acá.
  process.env.OFF_ENABLED = 'false';
});

afterEach(async () => {
  vi.restoreAllMocks();
  cache.clear();
  _resetIaProvider();
  // The pipeline now persists rows + writes images. Clean both so subsequent
  // test files start with an empty database.
  await prisma.product.deleteMany();
});

afterAll(async () => {
  // Best-effort cleanup of any stray image files created by the POST path.
  if (existsSync(UPLOADS_DIR)) {
    for (const f of readdirSync(UPLOADS_DIR)) {
      if (/^[a-f0-9]{64}\.(jpg|png|pdf|bin)$/.test(f)) {
        rmSync(resolve(UPLOADS_DIR, f), { force: true });
      }
    }
  }
  await prisma.$disconnect();
});

const VALID_RAW = JSON.stringify({
  producto: 'Mock Product',
  categoria: 'otros',
  ingredientes_detectados: [],
  alergenos: [],
  sellos: [],
  apto_vegano: true,
  apto_celiaco: true,
  apto_sin_lactosa: true,
  riesgo: 'bajo',
  confidence: 0.9,
});

function callResult(raw: string): IaCallResult {
  return { raw, usage: { in: 0, out: 0 }, latencyMs: 1 };
}

function logLines(spy: WriteSpy): Record<string, unknown>[] {
  return spy.mock.calls
    .map((c) => c[0])
    .filter((c): c is string => typeof c === 'string')
    .map((c) => JSON.parse(c.trim()) as Record<string, unknown>);
}

describe('POST /api/analyze — happy path (US-08 Escenario 1)', () => {
  it('returns 200 with the validated product for a valid JPG', async () => {
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Request-Id')).toMatch(UUID_RE);

    const body = await res.json();
    expect(body).toMatchObject({
      id: expect.stringMatching(UUID_RE),
      product: expect.objectContaining({
        producto: expect.any(String),
        confidence: expect.any(Number),
      }),
      savedAt: expect.any(String),
      pipelineTrace: expect.arrayContaining([
        expect.objectContaining({ name: 'validate_file', status: 'ok' }),
        expect.objectContaining({ name: 'extract_with_ia', status: 'ok' }),
        expect.objectContaining({ name: 'validate_schema', status: 'ok' }),
      ]),
    });
  });

  it('returns 200 for a valid PNG', async () => {
    const res = await POST(
      makeRequest({
        mime: 'image/png',
        body: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        filename: 'label.png',
      }) as never,
    );
    expect(res.status).toBe(200);
  });

  it('returns 200 for a valid PDF', async () => {
    const res = await POST(
      makeRequest({
        mime: 'application/pdf',
        body: MINIMAL_VALID_PDF,
        filename: 'label.pdf',
      }) as never,
    );
    expect(res.status).toBe(200);
  });
});

describe('POST /api/analyze — headers', () => {
  it('echoes X-Request-Id when client provides a valid UUID', async () => {
    const requestId = '11111111-2222-3333-4444-555555555555';
    const res = await POST(makeRequest({ headers: { 'x-request-id': requestId } }) as never);
    expect(res.headers.get('X-Request-Id')).toBe(requestId);
  });

  it('generates a new request id when the client header is malformed', async () => {
    const res = await POST(makeRequest({ headers: { 'x-request-id': 'not-a-uuid' } }) as never);
    expect(res.headers.get('X-Request-Id')).toMatch(UUID_RE);
    expect(res.headers.get('X-Request-Id')).not.toBe('not-a-uuid');
  });

  it('uses X-File-Hash from the header when it is a valid sha256 hex', async () => {
    const hash = 'a'.repeat(64);
    const res = await POST(makeRequest({ headers: { 'x-file-hash': hash } }) as never);
    expect(res.status).toBe(200);
    const logged = logLines(stdoutWrite).find((l) => l.event === 'upload.received');
    expect(logged?.fileHash).toBe(hash);
  });

  it('computes the sha256 server-side when X-File-Hash is missing', async () => {
    const body = Buffer.from('payload bytes');
    const res = await POST(makeRequest({ body }) as never);
    expect(res.status).toBe(200);
    const logged = logLines(stdoutWrite).find((l) => l.event === 'upload.received');
    expect(logged?.fileHash).toMatch(SHA256_HEX_RE);
  });

  it('ignores X-File-Hash when not a valid sha256 hex (length mismatch)', async () => {
    const res = await POST(makeRequest({ headers: { 'x-file-hash': 'too-short' } }) as never);
    expect(res.status).toBe(200);
    const logged = logLines(stdoutWrite).find((l) => l.event === 'upload.received');
    expect(logged?.fileHash).toMatch(SHA256_HEX_RE);
    expect(logged?.fileHash).not.toBe('too-short');
  });
});

describe('POST /api/analyze — logging (US-08 Escenario 3)', () => {
  it('emits upload.received with mime, sizeBytes, fileHash, requestId', async () => {
    const requestId = '99999999-aaaa-bbbb-cccc-dddddddddddd';
    await POST(makeRequest({ headers: { 'x-request-id': requestId } }) as never);
    const logged = logLines(stdoutWrite).find((l) => l.event === 'upload.received');
    expect(logged).toMatchObject({
      event: 'upload.received',
      requestId,
      mime: 'image/jpeg',
      sizeBytes: 4,
      fileHash: expect.stringMatching(SHA256_HEX_RE),
    });
  });

  it('emits api.error on stderr when validation fails', async () => {
    await POST(makeRequest({ mime: 'image/gif' }) as never);
    const logged = logLines(stderrWrite).find((l) => l.event === 'api.error');
    expect(logged).toMatchObject({
      level: 'warn',
      code: 'unsupported_file_type',
      httpStatus: 400,
    });
  });
});

describe('POST /api/analyze — structured 4xx (US-08 Escenario 1, all error codes)', () => {
  it('400 unsupported_file_type when `file` field is missing', async () => {
    const res = await POST(makeRequest({ withFile: false }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'unsupported_file_type' });
    expect(body.reason).toBeTypeOf('string');
  });

  it('400 unsupported_file_type when MIME is not on the allowlist', async () => {
    const res = await POST(
      makeRequest({
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename: 'doc.docx',
      }) as never,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('unsupported_file_type');
  });

  it('400 empty_file when the multipart file is 0 bytes', async () => {
    const res = await POST(makeRequest({ body: Buffer.alloc(0) }) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('empty_file');
  });

  it('400 file_too_large for an 11 MB JPG', async () => {
    const res = await POST(makeRequest({ body: Buffer.alloc(11 * 1024 * 1024) }) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('file_too_large');
  });

  it('400 pdf_unreadable for a corrupt PDF', async () => {
    const res = await POST(
      makeRequest({
        mime: 'application/pdf',
        body: Buffer.from('%PDF-1.4 corrupt'),
        filename: 'broken.pdf',
      }) as never,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('pdf_unreadable');
  });

  it('preserves Content-Type and X-Request-Id headers on error responses', async () => {
    const requestId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const res = await POST(
      makeRequest({ mime: 'image/gif', headers: { 'x-request-id': requestId } }) as never,
    );
    expect(res.headers.get('Content-Type')).toMatch(/application\/json/);
    expect(res.headers.get('X-Request-Id')).toBe(requestId);
  });
});

// Helper for the IA-pipeline integration tests: spy on the singleton's
// analyzeLabel and feed it a controllable sequence of responses.
function spyOnAnalyzeLabel() {
  const ia = getIaProvider();
  if (!(ia instanceof MockIaProvider)) {
    throw new Error('Test setup invariant: IA_PROVIDER must be mock in this suite.');
  }
  return vi.spyOn(ia, 'analyzeLabel');
}

describe('POST /api/analyze — IA pipeline (US-09 + US-14)', () => {
  it('caches the extraction by file hash: second request for the same buffer skips the provider', async () => {
    const buffer = Buffer.from('cached-bytes-' + Math.random());
    const spy = spyOnAnalyzeLabel();

    const r1 = await POST(makeRequest({ body: buffer }) as never);
    expect(r1.status).toBe(200);
    expect(spy).toHaveBeenCalledOnce();

    const r2 = await POST(makeRequest({ body: buffer }) as never);
    expect(r2.status).toBe(200);
    expect(spy).toHaveBeenCalledOnce(); // unchanged → cache hit

    const body = await r2.json();
    const extractTrace = (
      body.pipelineTrace as Array<{ name: string; details?: Record<string, unknown> }>
    ).find((t) => t.name === 'extract_with_ia');
    expect(extractTrace?.details).toMatchObject({ cached: true });
  });

  it('records promptVersion in the pipelineTrace for traceability (US-09 Escenario 3)', async () => {
    const res = await POST(
      makeRequest({ body: Buffer.from('trace-prompt-' + Math.random()) }) as never,
    );
    const body = await res.json();
    const extractTrace = (
      body.pipelineTrace as Array<{ name: string; details?: Record<string, unknown> }>
    ).find((t) => t.name === 'extract_with_ia');
    expect(extractTrace?.details).toMatchObject({ promptVersion: 'extract_product-v1' });
  });

  it('triggers corrective retry when the first IA response violates the schema (US-14 Escenario 3)', async () => {
    const spy = spyOnAnalyzeLabel();
    spy.mockResolvedValueOnce(callResult('{"producto": 123}')); // bad schema
    spy.mockResolvedValueOnce(callResult(VALID_RAW)); // corrective ok

    const res = await POST(
      makeRequest({ body: Buffer.from('corrective-' + Math.random()) }) as never,
    );

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1]?.[2]).toMatchObject({
      promptVersion: 'extract_product-v1-corrective',
    });
    const body = await res.json();
    const trace = (
      body.pipelineTrace as Array<{ name: string; details?: Record<string, unknown> }>
    ).find((t) => t.name === 'validate_schema');
    expect(trace?.details).toMatchObject({ attempt: 2, corrective: true });
  });

  it('returns 422 extraction_invalid when both extraction attempts fail schema (US-14 Escenario 3)', async () => {
    const spy = spyOnAnalyzeLabel();
    spy.mockResolvedValueOnce(callResult('{"producto": 123}'));
    spy.mockResolvedValueOnce(callResult('{"still": "bad"}'));

    const res = await POST(
      makeRequest({ body: Buffer.from('still-bad-' + Math.random()) }) as never,
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toMatchObject({
      error: 'extraction_invalid',
      details: { firstReason: 'schema_violation', secondReason: 'schema_violation' },
    });
  });

  it('maps APIConnectionTimeoutError from the provider → 504 model_timeout', async () => {
    const spy = spyOnAnalyzeLabel();
    spy.mockImplementation(() => {
      throw mapProviderError(new APIConnectionTimeoutError({ message: 'timeout' }));
    });

    const res = await POST(makeRequest({ body: Buffer.from('timeout-' + Math.random()) }) as never);
    expect(res.status).toBe(504);
    expect((await res.json()).error).toBe('model_timeout');
  });

  it('maps APIError 429 from the provider → 429 model_rate_limited', async () => {
    const spy = spyOnAnalyzeLabel();
    spy.mockImplementation(() => {
      throw mapProviderError(new APIError(429, undefined as never, 'rate', undefined));
    });
    const res = await POST(makeRequest({ body: Buffer.from('429-' + Math.random()) }) as never);
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('model_rate_limited');
  });

  it('maps APIError 503 from the provider → 502 model_error', async () => {
    const spy = spyOnAnalyzeLabel();
    spy.mockImplementation(() => {
      throw mapProviderError(new APIError(503, undefined as never, 'down', undefined));
    });
    const res = await POST(makeRequest({ body: Buffer.from('503-' + Math.random()) }) as never);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('model_error');
  });
});

describe('POST /api/analyze — detect_label_kind gate (US-05)', () => {
  function spyOnClassifyLabelKind() {
    const ia = getIaProvider();
    if (!(ia instanceof MockIaProvider)) throw new Error('IA_PROVIDER must be mock');
    return vi.spyOn(ia, 'classifyLabelKind');
  }

  it('Escenario 1: returns 422 image_not_supported when classifier reports not-food with high confidence', async () => {
    const spy = spyOnClassifyLabelKind();
    spy.mockResolvedValue({
      raw: JSON.stringify({ is_food_label: false, confidence: 0.93 }),
      usage: { in: 0, out: 0 },
      latencyMs: 1,
    });
    const analyzeSpy = spyOnAnalyzeLabel();

    const res = await POST(makeRequest({ body: Buffer.from('paisaje-' + Math.random()) }) as never);

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toMatchObject({
      error: 'image_not_supported',
      details: { confidence: 0.93 },
    });
    // The pipeline must abort before hitting the expensive extraction step.
    expect(analyzeSpy).not.toHaveBeenCalled();
  });

  it('Escenario 2: passes through to extract_with_ia when classifier reports food label', async () => {
    const res = await POST(
      makeRequest({ body: Buffer.from('etiqueta-' + Math.random()) }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.labelKind).toMatchObject({
      is_food_label: true,
      confidence: 0.95,
      lowConfidence: false,
    });
    const trace = (body.pipelineTrace as Array<{ name: string }>).map((t) => t.name);
    expect(trace).toEqual([
      'validate_file',
      'detect_label_kind',
      'extract_with_ia',
      'validate_schema',
      'enrich_with_off',
      'apply_rules',
      'compute_risk',
      'generate_explanation',
      'persist',
    ]);
  });

  it('Escenario 3: low confidence (< 0.6) passes with lowConfidence flag for UI badge', async () => {
    const spy = spyOnClassifyLabelKind();
    spy.mockResolvedValue({
      raw: JSON.stringify({ is_food_label: true, confidence: 0.42 }),
      usage: { in: 0, out: 0 },
      latencyMs: 1,
    });

    const res = await POST(makeRequest({ body: Buffer.from('borrosa-' + Math.random()) }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.labelKind).toMatchObject({
      is_food_label: true,
      confidence: 0.42,
      lowConfidence: true,
    });
    const detectTrace = (
      body.pipelineTrace as Array<{ name: string; details?: Record<string, unknown> }>
    ).find((t) => t.name === 'detect_label_kind');
    expect(detectTrace?.details).toMatchObject({ lowConfidence: true });
  });

  it('Cache: second upload of the same buffer skips the classifier (1 h TTL)', async () => {
    const spy = spyOnClassifyLabelKind();
    const buffer = Buffer.from('label-cache-' + Math.random());

    const r1 = await POST(makeRequest({ body: buffer }) as never);
    expect(r1.status).toBe(200);
    expect(spy).toHaveBeenCalledOnce();

    const r2 = await POST(makeRequest({ body: buffer }) as never);
    expect(r2.status).toBe(200);
    expect(spy).toHaveBeenCalledOnce(); // unchanged → cache hit

    const detectTrace = (
      (await r2.json()).pipelineTrace as Array<{ name: string; details?: Record<string, unknown> }>
    ).find((t) => t.name === 'detect_label_kind');
    expect(detectTrace?.details).toMatchObject({ cached: true });
  });

  it('always includes the legally-required disclaimer in the response (US-19)', async () => {
    const res = await POST(
      makeRequest({ body: Buffer.from('disclaimer-' + Math.random()) }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.disclaimer).toBe(
      'NutriLens es un asistente informativo, no reemplaza el consejo de un profesional de nutrición.',
    );
  });

  it('exposes rules + risk-overridden product after apply_rules + compute_risk (US-16 + US-17)', async () => {
    const res = await POST(makeRequest({ body: Buffer.from('rules-' + Math.random()) }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rules).toMatchObject({
      apto_vegano: expect.any(Boolean),
      apto_celiaco: expect.any(Boolean),
      apto_sin_lactosa: expect.any(Boolean),
      reglas_aplicadas: expect.any(Array),
    });
    // The Mock returns a no-restrictions product → all apto + low risk.
    expect(body.product.apto_celiaco).toBe(true);
    expect(body.product.riesgo).toBe('bajo');
  });

  it('returns an explanation that already contains the disclaimer (US-18 + sanitize)', async () => {
    const res = await POST(makeRequest({ body: Buffer.from('expl-' + Math.random()) }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.explanation).toContain('NutriLens es un asistente informativo');
  });

  it('still responds 200 with explanation=null when the model fails (graceful skip, spec §5.4)', async () => {
    const ia = getIaProvider();
    if (!(ia instanceof MockIaProvider)) throw new Error('IA_PROVIDER must be mock');
    vi.spyOn(ia, 'generateExplanation').mockRejectedValue(new Error('mini model down'));

    const res = await POST(makeRequest({ body: Buffer.from('no-expl-' + Math.random()) }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.explanation).toBeNull();
    // Disclaimer + product still present.
    expect(body.disclaimer).toContain('NutriLens es un asistente informativo');
    expect(body.product).not.toBeNull();
    const explTrace = (body.pipelineTrace as Array<{ name: string; status: string }>).find(
      (t) => t.name === 'generate_explanation',
    );
    expect(explTrace?.status).toBe('skipped');
  });

  it('Cache: re-uploading a known not-food file short-circuits 422 without calling the classifier', async () => {
    const spy = spyOnClassifyLabelKind();
    spy.mockResolvedValue({
      raw: JSON.stringify({ is_food_label: false, confidence: 0.9 }),
      usage: { in: 0, out: 0 },
      latencyMs: 1,
    });
    const buffer = Buffer.from('cached-reject-' + Math.random());

    const r1 = await POST(makeRequest({ body: buffer }) as never);
    expect(r1.status).toBe(422);
    expect(spy).toHaveBeenCalledOnce();

    const r2 = await POST(makeRequest({ body: buffer }) as never);
    expect(r2.status).toBe(422);
    expect(spy).toHaveBeenCalledOnce();
  });
});
