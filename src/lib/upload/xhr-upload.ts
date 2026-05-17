/**
 * XHR-based file upload to `POST /api/analyze`.
 *
 * We use XMLHttpRequest (not fetch) because fetch doesn't expose upload
 * progress events. The spec (E01 §7) requires a real progress bar during
 * the UPLOADING state, so XHR + `upload.onprogress` is mandatory.
 *
 * Returns a discriminated union — success carries the new product id,
 * error carries the structured ApiError body the UI maps via §9.
 */
import type { ErrorCode } from '@schemas/errors';

export type XhrUploadResult =
  | { kind: 'success'; id: string; requestId: string | null }
  | { kind: 'error'; error: ErrorCode; reason: string; requestId: string | null };

export interface XhrUploadOptions {
  file: File;
  fileHash: string;
  /**
   * Called as the byte stream uploads, with `loaded / total` in [0, 1].
   * Fires while the request body is in flight; once the body finishes
   * uploading we transition into the server's "processing" phase
   * (which has no progress signal because the server is now working).
   */
  onProgress: (progress: number) => void;
  /**
   * Called once the body has finished uploading — the server is now
   * processing. The UI switches from UPLOADING → PROCESSING here.
   */
  onUploadDone: () => void;
  /** Optional injection point for tests. Defaults to `new XMLHttpRequest()`. */
  xhrFactory?: () => XMLHttpRequest;
}

const NETWORK_ERROR: { error: ErrorCode; reason: string } = {
  error: 'internal_error',
  reason: 'No pudimos conectarnos con el servidor. Verificá tu conexión.',
};

export function xhrUpload(opts: XhrUploadOptions): Promise<XhrUploadResult> {
  const { file, fileHash, onProgress, onUploadDone, xhrFactory } = opts;

  return new Promise((resolve) => {
    const xhr = xhrFactory ? xhrFactory() : new XMLHttpRequest();
    xhr.open('POST', '/api/analyze');
    xhr.setRequestHeader('X-File-Hash', fileHash);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(e.loaded / e.total);
      }
    };

    xhr.upload.onload = () => {
      onProgress(1);
      onUploadDone();
    };

    xhr.onerror = () => {
      resolve({
        kind: 'error',
        error: NETWORK_ERROR.error,
        reason: NETWORK_ERROR.reason,
        requestId: xhr.getResponseHeader('X-Request-Id'),
      });
    };

    xhr.ontimeout = () => {
      resolve({
        kind: 'error',
        error: 'model_timeout',
        reason: 'El análisis se demoró más de lo esperado.',
        requestId: xhr.getResponseHeader('X-Request-Id'),
      });
    };

    xhr.onload = () => {
      const requestId = xhr.getResponseHeader('X-Request-Id');
      const parsed = parseResponse(xhr.responseText);

      if (xhr.status >= 200 && xhr.status < 300) {
        if (
          parsed &&
          typeof parsed === 'object' &&
          'id' in parsed &&
          typeof parsed.id === 'string'
        ) {
          resolve({ kind: 'success', id: parsed.id, requestId });
          return;
        }
        resolve({
          kind: 'error',
          error: 'internal_error',
          reason: 'La respuesta del servidor no tiene el formato esperado.',
          requestId,
        });
        return;
      }

      if (
        parsed &&
        typeof parsed === 'object' &&
        'error' in parsed &&
        typeof parsed.error === 'string' &&
        'reason' in parsed &&
        typeof parsed.reason === 'string'
      ) {
        resolve({
          kind: 'error',
          error: parsed.error as ErrorCode,
          reason: parsed.reason,
          requestId,
        });
        return;
      }

      resolve({
        kind: 'error',
        error: xhr.status >= 500 ? 'internal_error' : 'unsupported_file_type',
        reason: 'No pudimos procesar la respuesta del servidor.',
        requestId,
      });
    };

    const fd = new FormData();
    fd.append('file', file);
    fd.append('source', 'upload');
    xhr.send(fd);
  });
}

function parseResponse(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
