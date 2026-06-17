/**
 * Tests del decoder de código de barras (NL-601).
 * Round-trip real: generamos un EAN-13 con el writer de zxing y lo decodificamos
 * con `decodeBarcode` (mismo pipeline canvas + reader que corre en producción).
 */
import { describe, expect, it } from 'vitest';
import { writeBarcode } from 'zxing-wasm/writer';
import { decodeBarcode } from '@/lib/off/decode-barcode';

async function barcodePng(value: string, format: 'EAN-13' | 'EAN-8' = 'EAN-13'): Promise<Buffer> {
  const res = await writeBarcode(value, { format, scale: 4 });
  if (res.error || !res.image) throw new Error(`writer failed: ${res.error}`);
  return Buffer.from(await (res.image as Blob).arrayBuffer());
}

describe('decodeBarcode (NL-601)', () => {
  it('decodifica un EAN-13 válido desde la imagen', async () => {
    const ean = '4006381333931';
    const png = await barcodePng(ean);
    expect(await decodeBarcode(png, 'image/png')).toBe(ean);
  });

  it('decodifica un EAN-8', async () => {
    const ean = '96385074';
    const png = await barcodePng(ean, 'EAN-8');
    expect(await decodeBarcode(png, 'image/png')).toBe(ean);
  });

  it('devuelve null cuando la imagen no tiene código de barras', async () => {
    // PNG 1x1 (sin barcode) generado por el propio canvas.
    const { createCanvas } = await import('@napi-rs/canvas');
    const canvas = createCanvas(20, 20);
    const blank = canvas.toBuffer('image/png');
    expect(await decodeBarcode(blank, 'image/png')).toBeNull();
  });

  it('devuelve null (no lanza) ante bytes inválidos', async () => {
    expect(await decodeBarcode(Buffer.from('no soy una imagen'), 'image/png')).toBeNull();
  });
});
