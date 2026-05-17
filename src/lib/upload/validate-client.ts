/**
 * Client-side file validations.
 * See `docs/specs/E01-onboarding-y-upload.md §3`.
 *
 * Runs in the browser BEFORE the multipart request so the user gets feedback
 * without consuming bandwidth or tokens. The same checks are duplicated in
 * the backend `validate_file` step — never trust the client.
 */
import type { ErrorCode } from '@schemas/errors';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXTENSIONS: Record<AllowedMime, readonly string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'application/pdf': ['pdf'],
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: ErrorCode; reason: string };

export function validateClientFile(file: File): ValidationResult {
  if (file.size <= 0) {
    return {
      ok: false,
      error: 'empty_file',
      reason: 'El archivo está vacío.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: 'file_too_large',
      reason: 'El archivo supera el tamaño máximo de 10 MB.',
    };
  }

  if (!isAllowedMime(file.type)) {
    return {
      ok: false,
      error: 'unsupported_file_type',
      reason: 'Formato no soportado. Subí una imagen (JPG/PNG) o un PDF.',
    };
  }

  const ext = extractExtension(file.name);
  const validExtensions = MIME_TO_EXTENSIONS[file.type];
  if (!ext || !validExtensions.includes(ext)) {
    return {
      ok: false,
      error: 'unsupported_file_type',
      reason: 'Formato no soportado. Subí una imagen (JPG/PNG) o un PDF.',
    };
  }

  return { ok: true };
}

function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

function extractExtension(filename: string): string | null {
  const dotIdx = filename.lastIndexOf('.');
  if (dotIdx === -1 || dotIdx === filename.length - 1) return null;
  return filename.slice(dotIdx + 1).toLowerCase();
}
