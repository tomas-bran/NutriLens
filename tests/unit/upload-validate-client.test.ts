/**
 * Unit tests for client-side file validation.
 * Source of truth: `docs/specs/E01-onboarding-y-upload.md §3`.
 */
import { describe, expect, it } from 'vitest';
import {
  MAX_FILE_SIZE_BYTES,
  validateClientFile,
} from '@/lib/upload/validate-client';

function mkFile(name: string, type: string, size: number): File {
  // happy-dom's File honors `size` from the byte content we pass in.
  return new File([new Uint8Array(size)], name, { type });
}

describe('validateClientFile — accepts valid files', () => {
  it('accepts a JPG under 10 MB', () => {
    const file = mkFile('etiqueta.jpg', 'image/jpeg', 500_000);
    expect(validateClientFile(file)).toEqual({ ok: true });
  });

  it('accepts a JPG with .jpeg extension', () => {
    const file = mkFile('foto.jpeg', 'image/jpeg', 1024);
    expect(validateClientFile(file)).toEqual({ ok: true });
  });

  it('accepts a PNG', () => {
    const file = mkFile('etiqueta.png', 'image/png', 1024);
    expect(validateClientFile(file)).toEqual({ ok: true });
  });

  it('accepts a PDF', () => {
    const file = mkFile('ficha.pdf', 'application/pdf', 1024);
    expect(validateClientFile(file)).toEqual({ ok: true });
  });

  it('accepts a file exactly at the 10 MB limit', () => {
    const file = mkFile('big.jpg', 'image/jpeg', MAX_FILE_SIZE_BYTES);
    expect(validateClientFile(file)).toEqual({ ok: true });
  });

  it('extension matching is case-insensitive', () => {
    const file = mkFile('FOTO.JPG', 'image/jpeg', 1024);
    expect(validateClientFile(file)).toEqual({ ok: true });
  });
});

describe('validateClientFile — empty file', () => {
  it('rejects a 0-byte file with empty_file', () => {
    const file = mkFile('empty.jpg', 'image/jpeg', 0);
    expect(validateClientFile(file)).toEqual({
      ok: false,
      error: 'empty_file',
      reason: 'El archivo está vacío.',
    });
  });
});

describe('validateClientFile — file too large', () => {
  it('rejects a file 1 byte over the limit', () => {
    const file = mkFile('big.jpg', 'image/jpeg', MAX_FILE_SIZE_BYTES + 1);
    const result = validateClientFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('file_too_large');
      expect(result.reason).toContain('10 MB');
    }
  });

  it('rejects a 20 MB file', () => {
    const file = mkFile('huge.png', 'image/png', 20 * 1024 * 1024);
    const result = validateClientFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('file_too_large');
  });
});

describe('validateClientFile — unsupported MIME', () => {
  it('rejects .docx', () => {
    const file = mkFile(
      'doc.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      1024,
    );
    const result = validateClientFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('unsupported_file_type');
      expect(result.reason).toContain('JPG/PNG');
      expect(result.reason).toContain('PDF');
    }
  });

  it('rejects .txt', () => {
    const file = mkFile('notes.txt', 'text/plain', 100);
    const result = validateClientFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unsupported_file_type');
  });

  it('rejects WebP image (not in allowed list)', () => {
    const file = mkFile('foto.webp', 'image/webp', 1024);
    const result = validateClientFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unsupported_file_type');
  });

  it('rejects an empty MIME type', () => {
    const file = mkFile('foto.jpg', '', 1024);
    const result = validateClientFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unsupported_file_type');
  });
});

describe('validateClientFile — extension/MIME mismatch', () => {
  it('rejects a .docx file that claims to be image/jpeg', () => {
    const file = mkFile('disguised.docx', 'image/jpeg', 1024);
    const result = validateClientFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unsupported_file_type');
  });

  it('rejects a .png file with mime application/pdf', () => {
    const file = mkFile('weird.png', 'application/pdf', 1024);
    const result = validateClientFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unsupported_file_type');
  });

  it('rejects a file with no extension', () => {
    const file = mkFile('noext', 'image/jpeg', 1024);
    const result = validateClientFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unsupported_file_type');
  });

  it('rejects a file ending with a dot', () => {
    const file = mkFile('weird.', 'image/jpeg', 1024);
    const result = validateClientFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unsupported_file_type');
  });
});
