/**
 * Maps API error codes to user-facing UI text (title + description + action).
 * Source of truth: `docs/specs/E01-onboarding-y-upload.md §9`.
 *
 * Some error codes use the `reason` field from the API response as their
 * description ("usa `reason`" in the spec table); for those we pass through
 * the server-provided text. The rest use canned copy.
 */
import type { ErrorCode } from '@schemas/errors';

export type RetryActionKind = 'new_file' | 'retry_same' | 'retry_with_alt';

export interface ErrorUi {
  title: string;
  /**
   * `null` means: render the API `reason` field instead.
   * `string` means: ignore `reason`, show this canned description.
   */
  description: string | null;
  primaryActionLabel: string;
  /** Secondary action label, when applicable. `null` otherwise. */
  secondaryActionLabel: string | null;
  /** What kind of recovery the actions trigger. */
  actionKind: RetryActionKind;
}

const FALLBACK_UI: ErrorUi = {
  title: 'Algo salió mal',
  description: 'Tuvimos un problema procesando tu archivo.',
  primaryActionLabel: 'Reintentar',
  secondaryActionLabel: 'Probar con otro archivo',
  actionKind: 'retry_with_alt',
};

const MAPPING: Record<ErrorCode, ErrorUi> = {
  unsupported_file_type: {
    title: 'Formato no soportado',
    description: null,
    primaryActionLabel: 'Probar con otro archivo',
    secondaryActionLabel: null,
    actionKind: 'new_file',
  },
  file_too_large: {
    title: 'Archivo muy grande',
    description: 'El archivo supera el límite de 10 MB. Subí una imagen más liviana.',
    primaryActionLabel: 'Probar con otro archivo',
    secondaryActionLabel: null,
    actionKind: 'new_file',
  },
  empty_file: {
    title: 'Archivo vacío',
    description: 'No pudimos leer el archivo. Probá con otro.',
    primaryActionLabel: 'Probar con otro archivo',
    secondaryActionLabel: null,
    actionKind: 'new_file',
  },
  pdf_unreadable: {
    title: 'PDF ilegible',
    description: 'No pudimos abrir el PDF. Probá con una foto.',
    primaryActionLabel: 'Probar con otro archivo',
    secondaryActionLabel: null,
    actionKind: 'new_file',
  },
  image_not_supported: {
    title: 'No parece un producto',
    description:
      'La imagen no parece ser de un producto alimentario. Probá con la foto del envase.',
    primaryActionLabel: 'Probar con otro archivo',
    secondaryActionLabel: null,
    actionKind: 'new_file',
  },
  model_timeout: {
    title: 'Tardamos demasiado',
    description: 'El análisis se demoró más de lo esperado.',
    primaryActionLabel: 'Reintentar',
    secondaryActionLabel: null,
    actionKind: 'retry_same',
  },
  model_rate_limited: {
    title: 'Demasiadas solicitudes',
    description: 'Esperá unos segundos y volvé a intentar.',
    primaryActionLabel: 'Reintentar',
    secondaryActionLabel: null,
    actionKind: 'retry_same',
  },
  model_error: { ...FALLBACK_UI },
  internal_error: { ...FALLBACK_UI },

  // Codes that can technically surface here but aren't called out in §9.
  // They get the conservative fallback (retry + alt).
  extraction_invalid: { ...FALLBACK_UI },
  invalid_question: { ...FALLBACK_UI },
  invalid_query: { ...FALLBACK_UI },
  not_found: { ...FALLBACK_UI },
};

export function mapErrorCodeToUi(code: ErrorCode): ErrorUi {
  return MAPPING[code];
}

/**
 * Resolves the description shown to the user, falling back to the API
 * `reason` when the mapping says so (description === null).
 */
export function resolveErrorDescription(code: ErrorCode, apiReason: string): string {
  const ui = mapErrorCodeToUi(code);
  return ui.description ?? apiReason;
}
