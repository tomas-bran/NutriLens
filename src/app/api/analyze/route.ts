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
import { getUserId } from '@/lib/auth/current-user';
import { logger } from '@/lib/logger';
import { recordUserAnalysis } from '@/lib/products/record-analysis';
import type { AnalysisContext } from '@/lib/pipeline/context';
import { apply_rules } from '@/lib/pipeline/steps/apply-rules';
import { compute_risk } from '@/lib/pipeline/steps/compute-risk';
import { detect_label_kind } from '@/lib/pipeline/steps/detect-label-kind';
import { enrich_with_off } from '@/lib/pipeline/steps/enrich-with-off';
import { extract_with_ia } from '@/lib/pipeline/steps/extract-with-ia';
import { generate_explanation } from '@/lib/pipeline/steps/generate-explanation';
import { persist } from '@/lib/pipeline/steps/persist';
import { validate_file, MAX_FILE_BYTES } from '@/lib/pipeline/steps/validate-file';
import { validate_schema } from '@/lib/pipeline/steps/validate-schema';
import type { AnalysisFile } from '@/lib/pipeline/context';

/** Mimes aceptados para la imagen dedicada del código de barras (NL-601). */
const BARCODE_IMAGE_MIMES = ['image/jpeg', 'image/png'];

/**
 * Lee la imagen opcional del código de barras del multipart (campo
 * `barcodeImage`). Best-effort: si falta, no es imagen o excede el límite,
 * devuelve `undefined` y el análisis sigue con la foto principal.
 */
async function readOptionalBarcodeImage(formData: FormData): Promise<AnalysisFile | undefined> {
  const field = formData.get('barcodeImage');
  if (!field || typeof field === 'string' || field.size === 0) return undefined;
  if (!BARCODE_IMAGE_MIMES.includes(field.type) || field.size > MAX_FILE_BYTES) return undefined;
  const buffer = Buffer.from(await field.arrayBuffer());
  return {
    name: field.name,
    mime: field.type,
    sizeBytes: buffer.length,
    hash: createHash('sha256').update(buffer).digest('hex'),
    buffer,
  };
}

// Force the Node.js runtime — pdf-parse uses Node APIs and the multipart
// body parsing also benefits from the larger Node defaults.
export const runtime = 'nodejs';

// US-39: total pipeline budget in ms. Keeps the demo under 20s in the happy
// path. Individual AI step timeouts are lower (25s extract, 10s explain) so
// this fires only when a step is hung or the sum exceeds the budget.
const PIPELINE_TIMEOUT_MS = Number(process.env.PIPELINE_TIMEOUT_MS ?? 25_000);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_HEX_RE = /^[0-9a-f]{64}$/i;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = pickRequestId(request.headers.get('x-request-id'));

  // US-39: race the entire pipeline against a hard wall-clock timeout.
  const controller = new AbortController();
  const pipelineTimer = setTimeout(
    () =>
      controller.abort(new ApiError('model_timeout', 'El análisis superó el tiempo máximo.', 504)),
    PIPELINE_TIMEOUT_MS,
  );

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

    const barcodeImage = await readOptionalBarcodeImage(formData);

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
      ...(barcodeImage ? { barcodeImage } : {}),
      steps: [],
    };

    const ia = getIaProvider();
    let ctx = await validate_file(initialCtx);
    throwIfAborted(controller.signal);
    ctx = await detect_label_kind(ctx, ia);
    throwIfAborted(controller.signal);
    ctx = await extract_with_ia(ctx, ia);
    throwIfAborted(controller.signal);
    ctx = await validate_schema(ctx, ia);
    ctx = await enrich_with_off(ctx, ia);
    throwIfAborted(controller.signal);
    ctx = await apply_rules(ctx);
    ctx = await compute_risk(ctx);
    throwIfAborted(controller.signal);
    ctx = await generate_explanation(ctx, ia);
    throwIfAborted(controller.signal);
    ctx = await persist(ctx, { ia });

    if (!ctx.saved) {
      throw new Error('analyze: persist step did not produce a saved product');
    }

    // "Analizados por vos": vinculamos el producto al usuario logueado (de ahora
    // en adelante; sin backfill). Corre también en el camino de dedup —
    // re-analizar un producto ya existente igual lo agrega a tu filtro `mios`.
    // Fail-open dentro del helper: nunca tira abajo un análisis ya computado.
    const userId = await getUserId();
    if (userId) await recordUserAnalysis(userId, ctx.saved.id);

    // Shape per spec E01 §4.2 + the rules/explanation/disclaimer additions
    // from E03. `id` and `savedAt` come from the persisted row (so re-uploads
    // via dedup return the same id), while `product` stays as the in-memory
    // ProductExtraction the frontend has been consuming since US-09/US-14.
    clearTimeout(pipelineTimer);
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
    clearTimeout(pipelineTimer);
    // AbortController fires with the ApiError as its reason — unwrap it.
    const actual =
      err instanceof Error && err.name === 'AbortError' ? controller.signal.reason : err;
    return apiErrorResponse(actual, requestId);
  }
}

function pickRequestId(header: string | null): string {
  if (header && UUID_RE.test(header)) return header.toLowerCase();
  return randomUUID();
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason;
}
