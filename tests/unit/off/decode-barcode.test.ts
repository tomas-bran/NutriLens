/**
 * Tests del decoder de código de barras (NL-601).
 * Round-trip real: generamos un EAN-13 con el writer de zxing y lo decodificamos
 * con `decodeBarcode` (mismo pipeline canvas + reader que corre en producción).
 */
import { describe, expect, it } from 'vitest';
import { writeBarcode } from 'zxing-wasm/writer';
import { decodeBarcode, extractValidBarcode, isValidGtin } from '@/lib/off/decode-barcode';

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

describe('isValidGtin (NL-601 — checksum del fallback OCR)', () => {
  it('valida un EAN-13 real (Playadito)', () => {
    expect(isValidGtin('7793704000911')).toBe(true);
  });

  it('valida EAN-8 y UPC-A', () => {
    expect(isValidGtin('96385074')).toBe(true); // EAN-8
    expect(isValidGtin('036000291452')).toBe(true); // UPC-A (12)
  });

  it('rechaza un dígito verificador incorrecto', () => {
    expect(isValidGtin('7793704000912')).toBe(false);
  });

  it('rechaza largos inválidos / no numéricos', () => {
    expect(isValidGtin('123')).toBe(false);
    expect(isValidGtin('abcdefghijklm')).toBe(false);
  });
});

describe('extractValidBarcode (NL-601 — parseo de la respuesta OCR)', () => {
  it('extrae los dígitos de una respuesta limpia', () => {
    expect(extractValidBarcode('7793704000911')).toBe('7793704000911');
  });

  it('limpia espacios/texto y valida el checksum', () => {
    expect(extractValidBarcode('7 793704 000911')).toBe('7793704000911');
  });

  it('devuelve null para "NONE"', () => {
    expect(extractValidBarcode('NONE')).toBeNull();
  });

  it('devuelve null si el checksum no cierra (lectura OCR errónea)', () => {
    expect(extractValidBarcode('7793704000912')).toBeNull();
  });
});
