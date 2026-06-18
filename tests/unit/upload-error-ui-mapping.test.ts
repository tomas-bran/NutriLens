/**
 * Unit tests for the error code → UI mapping table.
 * Verifies the spec table at
 * `docs/specs/E01-onboarding-y-upload.md §9` is faithfully implemented.
 */
import { describe, expect, it } from 'vitest';
import { mapErrorCodeToUi, resolveErrorDescription } from '@/lib/upload/error-ui-mapping';

describe('mapErrorCodeToUi — title per error code (spec §9)', () => {
  const expectedTitles: Record<string, string> = {
    unsupported_file_type: 'Formato no soportado',
    file_too_large: 'Archivo muy grande',
    empty_file: 'Archivo vacío',
    pdf_unreadable: 'PDF ilegible',
    image_not_supported: 'No parece un producto',
    model_timeout: 'Tardamos demasiado',
    model_rate_limited: 'Demasiadas solicitudes',
    model_error: 'Algo salió mal',
    internal_error: 'Algo salió mal',
  };

  for (const [code, title] of Object.entries(expectedTitles)) {
    it(`${code} → "${title}"`, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(mapErrorCodeToUi(code as any).title).toBe(title);
    });
  }
});

describe('mapErrorCodeToUi — description (canned vs use reason)', () => {
  it('unsupported_file_type uses API reason (description=null)', () => {
    expect(mapErrorCodeToUi('unsupported_file_type').description).toBeNull();
  });

  it('image_not_supported has canned description mentioning producto', () => {
    expect(mapErrorCodeToUi('image_not_supported').description).toContain('producto');
  });

  it('file_too_large has canned description mentioning 10 MB', () => {
    const ui = mapErrorCodeToUi('file_too_large');
    expect(ui.description).not.toBeNull();
    expect(ui.description).toContain('10 MB');
  });

  it('empty_file has canned description', () => {
    expect(mapErrorCodeToUi('empty_file').description).toBe(
      'No pudimos leer el archivo. Probá con otro.',
    );
  });

  it('pdf_unreadable has canned description mentioning PDF', () => {
    const ui = mapErrorCodeToUi('pdf_unreadable');
    expect(ui.description).toContain('PDF');
  });

  it('model_timeout has canned description', () => {
    expect(mapErrorCodeToUi('model_timeout').description).toContain('demoró');
  });

  it('model_rate_limited has canned description', () => {
    expect(mapErrorCodeToUi('model_rate_limited').description).toContain('unos segundos');
  });

  it('model_error has fallback description', () => {
    expect(mapErrorCodeToUi('model_error').description).toContain('problema');
  });

  it('internal_error has fallback description', () => {
    expect(mapErrorCodeToUi('internal_error').description).toContain('problema');
  });
});

describe('mapErrorCodeToUi — actions per error code (spec §9)', () => {
  it('unsupported_file_type → "Probar con otro archivo", new_file', () => {
    const ui = mapErrorCodeToUi('unsupported_file_type');
    expect(ui.primaryActionLabel).toBe('Probar con otro archivo');
    expect(ui.secondaryActionLabel).toBeNull();
    expect(ui.actionKind).toBe('new_file');
  });

  it('file_too_large → "Probar con otro archivo", new_file', () => {
    const ui = mapErrorCodeToUi('file_too_large');
    expect(ui.primaryActionLabel).toBe('Probar con otro archivo');
    expect(ui.actionKind).toBe('new_file');
  });

  it('empty_file → "Probar con otro archivo", new_file', () => {
    const ui = mapErrorCodeToUi('empty_file');
    expect(ui.primaryActionLabel).toBe('Probar con otro archivo');
    expect(ui.actionKind).toBe('new_file');
  });

  it('pdf_unreadable → "Probar con otro archivo", new_file', () => {
    const ui = mapErrorCodeToUi('pdf_unreadable');
    expect(ui.primaryActionLabel).toBe('Probar con otro archivo');
    expect(ui.actionKind).toBe('new_file');
  });

  it('image_not_supported → "Probar con otro archivo", new_file', () => {
    const ui = mapErrorCodeToUi('image_not_supported');
    expect(ui.primaryActionLabel).toBe('Probar con otro archivo');
    expect(ui.actionKind).toBe('new_file');
  });

  it('model_timeout → "Reintentar", retry_same', () => {
    const ui = mapErrorCodeToUi('model_timeout');
    expect(ui.primaryActionLabel).toBe('Reintentar');
    expect(ui.actionKind).toBe('retry_same');
    expect(ui.secondaryActionLabel).toBeNull();
  });

  it('model_rate_limited → "Reintentar", retry_same', () => {
    const ui = mapErrorCodeToUi('model_rate_limited');
    expect(ui.primaryActionLabel).toBe('Reintentar');
    expect(ui.actionKind).toBe('retry_same');
  });

  it('model_error → "Reintentar" + "Probar con otro archivo", retry_with_alt', () => {
    const ui = mapErrorCodeToUi('model_error');
    expect(ui.primaryActionLabel).toBe('Reintentar');
    expect(ui.secondaryActionLabel).toBe('Probar con otro archivo');
    expect(ui.actionKind).toBe('retry_with_alt');
  });

  it('internal_error → "Reintentar" + "Probar con otro archivo", retry_with_alt', () => {
    const ui = mapErrorCodeToUi('internal_error');
    expect(ui.primaryActionLabel).toBe('Reintentar');
    expect(ui.secondaryActionLabel).toBe('Probar con otro archivo');
    expect(ui.actionKind).toBe('retry_with_alt');
  });
});

describe('mapErrorCodeToUi — fallback for codes not listed in §9', () => {
  it('extraction_invalid falls back to "Algo salió mal"', () => {
    expect(mapErrorCodeToUi('extraction_invalid').title).toBe('Algo salió mal');
  });

  it('not_found falls back to "Algo salió mal"', () => {
    expect(mapErrorCodeToUi('not_found').title).toBe('Algo salió mal');
  });

  it('invalid_question falls back to "Algo salió mal"', () => {
    expect(mapErrorCodeToUi('invalid_question').title).toBe('Algo salió mal');
  });
});

describe('resolveErrorDescription — picks canned vs reason', () => {
  it('uses API reason for unsupported_file_type', () => {
    expect(resolveErrorDescription('unsupported_file_type', 'mensaje del server')).toBe(
      'mensaje del server',
    );
  });

  it('uses canned description for image_not_supported, ignoring server reason', () => {
    expect(
      resolveErrorDescription(
        'image_not_supported',
        'La imagen no parece corresponder a un producto alimentario.',
      ),
    ).toBe('La imagen no parece ser de un producto alimentario. Probá con la foto del envase.');
  });

  it('uses canned description for file_too_large, ignoring server reason', () => {
    expect(resolveErrorDescription('file_too_large', 'whatever server said')).toContain('10 MB');
  });

  it('uses canned description for model_timeout', () => {
    expect(resolveErrorDescription('model_timeout', 'server said timeout')).toContain('demoró');
  });

  it('uses canned description for internal_error', () => {
    expect(resolveErrorDescription('internal_error', 'crash details')).toContain('problema');
  });
});
