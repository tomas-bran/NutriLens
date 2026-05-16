/**
 * POST /api/analyze — main pipeline entry point.
 *
 * Scope of US-08 / US-03: receive multipart, run validate_file, return a
 * placeholder 200 if everything passes (so the frontend can wire the round
 * trip while the IA pipeline lands in US-09+). Errors map to 4xx via
 * ApiError → structured body.
 *
 * See `docs/specs/E01-onboarding-y-upload.md §4-§5`.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { ApiError } from '@schemas/errors';
import { apiErrorResponse } from '@/lib/api/error-response';
import { logger } from '@/lib/logger';
import type { AnalysisContext } from '@/lib/pipeline/context';
import { validate_file } from '@/lib/pipeline/steps/validate-file';

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

    const validated = await validate_file(initialCtx);

    // PLACEHOLDER — the rest of the pipeline (detect_label_kind, extract_with_ia,
    // apply_rules, persist) lands in US-05/US-09/US-13/US-22. For now we return a
    // stable shape matching `docs/specs/E01-onboarding-y-upload.md §4.2` so the
    // frontend can wire the round trip.
    return NextResponse.json(
      {
        id: randomUUID(),
        product: null,
        savedAt: new Date().toISOString(),
        pipelineTrace: validated.steps,
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
