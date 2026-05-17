import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorage } from '@/lib/storage/local-storage';
import { mimeToExtension } from '@/lib/storage/types';

describe('mimeToExtension', () => {
  it.each<[string, string]>([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['application/pdf', 'pdf'],
  ])('%s → %s', (mime, ext) => {
    expect(mimeToExtension(mime)).toBe(ext);
  });

  it('falls back to "bin" for unknown mimes', () => {
    expect(mimeToExtension('application/octet-stream')).toBe('bin');
    expect(mimeToExtension('')).toBe('bin');
  });
});

describe('LocalStorage', () => {
  let dir: string;
  let storage: LocalStorage;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'nutrilens-storage-'));
    storage = new LocalStorage(dir, '/test-uploads');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes the buffer to <baseDir>/<hash>.<ext> and returns the public URL', async () => {
    const buf = Buffer.from('image bytes');
    const url = await storage.save(buf, 'image/jpeg', 'abc123');
    expect(url).toBe('/test-uploads/abc123.jpg');
    expect(existsSync(join(dir, 'abc123.jpg'))).toBe(true);
    expect(readFileSync(join(dir, 'abc123.jpg'))).toEqual(buf);
  });

  it.each<[string, string]>([
    ['image/png', 'png'],
    ['application/pdf', 'pdf'],
  ])('uses the right extension for mime %s', async (mime, ext) => {
    const url = await storage.save(Buffer.from('x'), mime, 'h');
    expect(url).toBe(`/test-uploads/h.${ext}`);
  });

  it('does not overwrite the file when called twice with the same hash (idempotent)', async () => {
    await storage.save(Buffer.from('original'), 'image/jpeg', 'same');
    await storage.save(Buffer.from('overwritten'), 'image/jpeg', 'same');
    expect(readFileSync(join(dir, 'same.jpg')).toString()).toBe('original');
  });

  it('creates the base directory if missing', async () => {
    const nested = join(dir, 'deep', 'nested');
    const s = new LocalStorage(nested);
    await s.save(Buffer.from('x'), 'image/jpeg', 'k');
    expect(existsSync(join(nested, 'k.jpg'))).toBe(true);
  });
});
