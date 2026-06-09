/**
 * POST /api/analyze — main pipeline entry point.
 *
 * Pipeline order (US-03 / US-05 / US-08 / US-09 / US-14 / US-16 / US-17 / US-18 / US-22):
 *   validate_file → detect_label_kind → extract_with_ia → validate_schema →
 *   enrich_with_off → apply_rules → compute_risk → generate_explanation →
 *   persist → respond 200
 *
 * See `docs/specs/E01-onboarding-y-upload.md §4-§5`,
 * `docs/specs/E02-analisis-multimodal-ia.md §3-§5`,
 * and `docs/specs/E03-clasificacion-reglas-explicacion.md`.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { ApiError } from '@schemas/errors';
import { getIaProvider } from '@/lib/ai';
import { apiErrorResponse } from '@/lib/api/error-response';
import { logger } from '@/lib/logger';
import type { AnalysisContext } from '@/lib/pipeline/context';
import { apply_rules } from '@/lib/pipeline/steps/apply-rules';
import { compute_risk } from '@/lib/pipeline/steps/compute-risk';
import { detect_label_kind } from '@/lib/pipeline/steps/detect-label-kind';
import { enrich_with_off } from '@/lib/pipeline/steps/enrich-with-off';
import { extract_with_ia } from '@/lib/pipeline/steps/extract-with-ia';
import { generate_explanation } from '@/lib/pipeline/steps/generate-explanation';
import { persist } from '@/lib/pipeline/steps/persist';
import { validate_file } from '@/lib/pipeline/steps/validate-file';
import { validate_schema } from '@/lib/pipeline/steps/validate-schema';

// Force the Node.js runtime — pdf-parse uses Node APIs and the multipart
// body parsing also benefits from the larger Node defaults.
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_HEX_RE = /^[0-9a-f]{64}$/i;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = pickRequestId(request.headers.get('x-request-id'));

  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ApiError(
        'unsupported_file_type',
        'Multipart inválido o vacío. Adjuntá el archivo en el campo `file`.',
        400,
      );
    }

    // undici (Node's FormData impl) maps an empty file part to a string,
    // not a File — so we split the cases: missing field vs. dropped-to-string
    // (empty file) vs. real File of size 0 vs. valid File.
    const fileField = formData.get('file');
    if (fileField === null) {
      throw new ApiError('unsupported_file_type', 'Falta el campo `file` en el multipart.', 400);
    }
    if (typeof fileField === 'string' || fileField.size === 0) {
      throw new ApiError('empty_file', 'El archivo está vacío.', 400);
    }

    const buffer = Buffer.from(await fileField.arrayBuffer());
    const computedHash = createHash('sha256').update(buffer).digest('hex');
    const headerHash = request.headers.get('x-file-hash');
    const fileHash =
      headerHash && SHA256_HEX_RE.test(headerHash) ? headerHash.toLowerCase() : computedHash;

    logger.info('upload.received', {
      requestId,
      mime: fileField.type,
      sizeBytes: buffer.length,
      fileHash,
    });

    const initialCtx: AnalysisContext = {
      requestId,
      startedAt: new Date().toISOString(),
      file: {
        name: fileField.name,
        mime: fileField.type,
        sizeBytes: buffer.length,
        hash: fileHash,
        buffer,
      },
      steps: [],
    };

    const ia = getIaProvider();
    let ctx = await validate_file(initialCtx);
    ctx = await detect_label_kind(ctx, ia);
    ctx = await extract_with_ia(ctx, ia);
    ctx = await validate_schema(ctx, ia);
    ctx = await enrich_with_off(ctx);
    ctx = await apply_rules(ctx);
    ctx = await compute_risk(ctx);
    ctx = await generate_explanation(ctx, ia);
    ctx = await persist(ctx);

    if (!ctx.saved) {
      throw new Error('analyze: persist step did not produce a saved product');
    }

    // Shape per spec E01 §4.2 + the rules/explanation/disclaimer additions
    // from E03. `id` and `savedAt` come from the persisted row (so re-uploads
    // via dedup return the same id), while `product` stays as the in-memory
    // ProductExtraction the frontend has been consuming since US-09/US-14.
    return NextResponse.json(
      {
        id: ctx.saved.id,
        product: ctx.product,
        rules: ctx.rules,
        labelKind: ctx.labelKind,
        explanation: ctx.explanation ?? null,
        // Always sent so the UI can render the legally-required disclaimer
        // regardless of whether the explanation generation succeeded (US-19).
        disclaimer:
          'NutriLens es un asistente informativo, no reemplaza el consejo de un profesional de nutrición.',
        savedAt: ctx.saved.createdAt.toISOString(),
        cachedFromDedup: ctx.cachedFromDedup === true,
        pipelineTrace: ctx.steps,
        offEnrichment: ctx.offEnrichment ?? null,
      },
      { status: 200, headers: { 'X-Request-Id': requestId } },
    );
  } catch (err) {
    return apiErrorResponse(err, requestId);
  }
}

function pickRequestId(header: string | null): string {
  if (header && UUID_RE.test(header)) return header.toLowerCase();
  return randomUUID();
}
