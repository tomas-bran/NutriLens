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
