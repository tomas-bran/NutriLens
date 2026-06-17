/**
 * Decodificación de código de barras de la imagen de la etiqueta (NL-601).
 *
 * El `barcode` que "lee" el LLM de visión suele venir mal: un código de barras
 * está pensado para escanearse, no para OCR. Acá lo decodificamos de verdad con
 * zxing (WASM) sobre los píxeles de la imagen, que es la fuente confiable para
 * el lookup exacto en Open Food Facts (`/api/v2/product/{barcode}`).
 *
 * Usamos el build `reader` (sin decoder de imágenes) + `@napi-rs/canvas` para
 * pasar de bytes JPG/PNG a píxeles crudos. Todo es best-effort: cualquier fallo
 * (imagen inválida, sin barcode, WASM) devuelve `null` y el pipeline sigue.
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readBarcodes } from 'zxing-wasm/reader';

/** Formatos de barcode de productos de consumo (los que indexa OFF). */
const PRODUCT_BARCODE_FORMATS = ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E'] as const;

/** EAN/UPC: 8 a 14 dígitos. Filtramos cualquier lectura que no lo parezca. */
const EAN_UPC_RE = /^\d{8,14}$/;

/**
 * Valida el dígito verificador de un GTIN (EAN-8/UPC-A/EAN-13/GTIN-14): de
 * derecha a izquierda (sin el check), se multiplica alternando ×3 y ×1. Sirve
 * para descartar lecturas OCR basura: un número al azar casi nunca cierra el
 * checksum.
 */
export function isValidGtin(code: string): boolean {
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  let sum = 0;
  digits.reverse().forEach((d, i) => {
    sum += d * (i % 2 === 0 ? 3 : 1);
  });
  return (10 - (sum % 10)) % 10 === check;
}

/**
 * Extrae un código EAN/UPC válido de un texto libre (la respuesta OCR del
 * modelo). El prompt pide solo los dígitos, así que limpiamos no-dígitos y
 * validamos el checksum. Devuelve `null` si no cierra (incluye el caso "NONE").
 */
export function extractValidBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  return EAN_UPC_RE.test(digits) && isValidGtin(digits) ? digits : null;
}

/**
 * Devuelve el primer código EAN/UPC válido encontrado en la imagen, o `null`.
 * Nunca lanza.
 */
export async function decodeBarcode(buffer: Buffer, _mime: string): Promise<string | null> {
  try {
    const img = await loadImage(buffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);

    // zxing duck-typea ImageData (lee data/width/height); pasamos un objeto plano.
    const results = await readBarcodes({ data, width, height } as unknown as ImageData, {
      formats: [...PRODUCT_BARCODE_FORMATS],
      tryHarder: true,
      maxNumberOfSymbols: 1,
    });

    const hit = results.find((r) => r.isValid && EAN_UPC_RE.test(r.text));
    return hit?.text ?? null;
  } catch {
    return null;
  }
}
