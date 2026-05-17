/**
 * Unit tests for client-side SHA-256 computation.
 * Reference values produced offline with `shasum -a 256`.
 */
import { describe, expect, it } from 'vitest';
import { computeFileHash } from '@/lib/upload/hash';

// SHA-256 of an empty file
const SHA256_EMPTY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

// SHA-256 of the ASCII string "NutriLens"
// Verified via `printf 'NutriLens' | shasum -a 256`
const SHA256_NUTRILENS = '14dcbd82e7f2481ef5af8112853dbb9d803f3c3ec197bcd29af44af9ff856872';

describe('computeFileHash', () => {
  it('returns a 64-char lowercase hex string', async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'a.bin', {
      type: 'application/octet-stream',
    });
    const hash = await computeFileHash(file);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes an empty file to the well-known SHA-256 zero', async () => {
    const file = new File([new Uint8Array(0)], 'empty', { type: 'application/octet-stream' });
    expect(await computeFileHash(file)).toBe(SHA256_EMPTY);
  });

  it('hashes the ASCII string "NutriLens" to the expected SHA-256', async () => {
    const bytes = new TextEncoder().encode('NutriLens');
    const file = new File([bytes], 'word.txt', { type: 'text/plain' });
    expect(await computeFileHash(file)).toBe(SHA256_NUTRILENS);
  });

  it('produces the same hash for two files with identical content', async () => {
    const bytes = new Uint8Array([10, 20, 30, 40, 50]);
    const a = new File([bytes], 'a.bin');
    const b = new File([bytes], 'b.bin');
    expect(await computeFileHash(a)).toBe(await computeFileHash(b));
  });

  it('produces different hashes for different content', async () => {
    const a = new File([new Uint8Array([1, 2, 3])], 'a.bin');
    const b = new File([new Uint8Array([1, 2, 4])], 'b.bin');
    expect(await computeFileHash(a)).not.toBe(await computeFileHash(b));
  });
});
