import { describe, it, expect } from 'vitest';
import { canReadPdf } from '@/lib/pdf/can-read';

// Minimal valid PDF (≈250 bytes) — parses cleanly with pdf-parse.
const MINIMAL_PDF = Buffer.from(
  `%PDF-1.0
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 3 3]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000053 00000 n
0000000102 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
158
%%EOF`,
  'utf-8',
);

describe('canReadPdf', () => {
  it('returns true for a valid minimal PDF', async () => {
    expect(await canReadPdf(MINIMAL_PDF)).toBe(true);
  });

  it('returns false for an empty buffer', async () => {
    expect(await canReadPdf(Buffer.alloc(0))).toBe(false);
  });

  it('returns false for garbage bytes', async () => {
    expect(await canReadPdf(Buffer.from('not a pdf at all'))).toBe(false);
  });

  it('returns false for a buffer with the PDF magic but corrupt body', async () => {
    expect(await canReadPdf(Buffer.from('%PDF-1.4\n<<<<<corrupt>>>>>'))).toBe(false);
  });
});
