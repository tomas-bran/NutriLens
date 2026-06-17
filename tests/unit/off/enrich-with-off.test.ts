/**
 * Tests del step enrich_with_off (NL-601) — foco en la resolución del código
 * de barras: decodificado de la imagen > leído por el LLM > búsqueda por nombre.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Solo stubeamos `decodeBarcode` (zxing); `extractValidBarcode`/`isValidGtin`
// quedan reales para ejercitar el parseo + checksum del fallback OCR.
vi.mock('@/lib/off/decode-barcode', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/off/decode-barcode')>();
  return { ...actual, decodeBarcode: vi.fn() };
});
vi.mock('@/lib/off/client', () => ({ fetchByBarcode: vi.fn(), fetchByName: vi.fn() }));

import { enrich_with_off } from '@/lib/pipeline/steps/enrich-with-off';
import { decodeBarcode } from '@/lib/off/decode-barcode';
import { fetchByBarcode, fetchByName } from '@/lib/off/client';
import type { OFFProduct } from '@/lib/off/client';
import type { IaProvider } from '@/lib/ai/types';
import type { AnalysisContext } from '@/lib/pipeline/context';
import type { ProductExtraction } from '@schemas/product';

/** IaProvider falso con solo `readBarcodeDigits` (lo único que usa el fallback OCR). */
function mkIa(rawDigits: string): IaProvider {
  return {
    readBarcodeDigits: vi
      .fn()
      .mockResolvedValue({ raw: rawDigits, usage: { in: 0, out: 0 }, latencyMs: 1 }),
  } as unknown as IaProvider;
}

const decodeMock = vi.mocked(decodeBarcode);
const byBarcodeMock = vi.mocked(fetchByBarcode);
const byNameMock = vi.mocked(fetchByName);

function mkOff(over: Partial<OFFProduct> = {}): OFFProduct {
  return {
    barcode: '7790001112223',
    product_name: 'Galletitas Test',
    brands: 'Marca',
    ingredients_text: 'Harina, _leche_, azúcar, sal',
    allergens_tags: ['en:milk'],
    labels_tags: [],
    nutriments: {},
    url: 'https://world.openfoodfacts.org/product/7790001112223',
    ...over,
  };
}

function mkProduct(over: Partial<ProductExtraction> = {}): ProductExtraction {
  return {
    producto: 'Galletitas Test',
    categoria: 'galletitas',
    ingredientes_detectados: [],
    alergenos: [],
    sellos: [],
    apto_vegano: false,
    apto_celiaco: false,
    apto_sin_lactosa: false,
    riesgo: 'bajo',
    confidence: 0.8,
    ...over,
  } as ProductExtraction;
}

function mkCtx(product?: ProductExtraction): AnalysisContext {
  return {
    requestId: 'req-1',
    startedAt: new Date().toISOString(),
    file: {
      name: 'x.jpg',
      mime: 'image/jpeg',
      sizeBytes: 10,
      hash: 'h',
      buffer: Buffer.from('img'),
    },
    steps: [],
    product,
  };
}

const ORIG = process.env.OFF_ENABLED;
beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.OFF_ENABLED;
  byNameMock.mockResolvedValue(null);
  byBarcodeMock.mockResolvedValue(null);
});
afterEach(() => {
  if (ORIG === undefined) delete process.env.OFF_ENABLED;
  else process.env.OFF_ENABLED = ORIG;
});

describe('enrich_with_off — resolución del barcode (NL-601)', () => {
  it('prefiere el barcode decodificado de la imagen sobre el del LLM', async () => {
    decodeMock.mockResolvedValue('7790001112223');
    await enrich_with_off(mkCtx(mkProduct({ barcode: '0000000000000' })));
    expect(byBarcodeMock).toHaveBeenCalledWith('7790001112223');
    expect(byNameMock).not.toHaveBeenCalled();
  });

  it('usa el barcode del LLM si no se pudo decodificar', async () => {
    decodeMock.mockResolvedValue(null);
    await enrich_with_off(mkCtx(mkProduct({ barcode: '7790009998887' })));
    expect(byBarcodeMock).toHaveBeenCalledWith('7790009998887');
    expect(byNameMock).not.toHaveBeenCalled();
  });

  it('cae a búsqueda por nombre si no hay barcode (ni decodificado ni del LLM)', async () => {
    decodeMock.mockResolvedValue(null);
    await enrich_with_off(mkCtx(mkProduct({ barcode: undefined })));
    expect(byBarcodeMock).not.toHaveBeenCalled();
    expect(byNameMock).toHaveBeenCalledWith('Galletitas Test', undefined);
  });

  it('registra barcodeSource=photo cuando el código sale de la foto principal', async () => {
    decodeMock.mockResolvedValue('7790001112223');
    const out = await enrich_with_off(mkCtx(mkProduct()));
    const trace = out.steps.find((s) => s.name === 'enrich_with_off');
    expect(trace?.details?.barcodeSource).toBe('photo');
  });

  it('prioriza la imagen dedicada del código de barras sobre la foto y el LLM', async () => {
    decodeMock.mockResolvedValue('7790001112223');
    const ctx = mkCtx(mkProduct({ barcode: '0000000000000' }));
    ctx.barcodeImage = {
      name: 'bc.jpg',
      mime: 'image/jpeg',
      sizeBytes: 5,
      hash: 'h2',
      buffer: Buffer.from('bc'),
    };
    const out = await enrich_with_off(ctx);
    expect(byBarcodeMock).toHaveBeenCalledWith('7790001112223');
    expect(byNameMock).not.toHaveBeenCalled();
    const trace = out.steps.find((s) => s.name === 'enrich_with_off');
    expect(trace?.details?.barcodeSource).toBe('barcode-image');
  });

  it('si la imagen dedicada no tiene código, cae a la foto principal', async () => {
    decodeMock.mockResolvedValueOnce(null).mockResolvedValueOnce('7790001112223');
    const ctx = mkCtx(mkProduct());
    ctx.barcodeImage = {
      name: 'bc.jpg',
      mime: 'image/jpeg',
      sizeBytes: 5,
      hash: 'h2',
      buffer: Buffer.from('bc'),
    };
    const out = await enrich_with_off(ctx);
    expect(decodeMock).toHaveBeenCalledTimes(2);
    expect(byBarcodeMock).toHaveBeenCalledWith('7790001112223');
    const trace = out.steps.find((s) => s.name === 'enrich_with_off');
    expect(trace?.details?.barcodeSource).toBe('photo');
  });

  it('con OFF_ENABLED=false ni siquiera decodifica', async () => {
    process.env.OFF_ENABLED = 'false';
    await enrich_with_off(mkCtx(mkProduct()));
    expect(decodeMock).not.toHaveBeenCalled();
    expect(byBarcodeMock).not.toHaveBeenCalled();
  });
});

describe('enrich_with_off — merge de datos de OFF (NL-601)', () => {
  it('unifica los alérgenos de OFF con los del producto', async () => {
    decodeMock.mockResolvedValue('7790001112223');
    byBarcodeMock.mockResolvedValue(mkOff({ allergens_tags: ['en:milk'] }));
    const out = await enrich_with_off(mkCtx(mkProduct({ alergenos: [] })));
    expect(out.product?.alergenos).toContain('leche');
  });

  it('toma los ingredientes de OFF cuando hay match por barcode', async () => {
    decodeMock.mockResolvedValue('7790001112223');
    byBarcodeMock.mockResolvedValue(mkOff({ ingredients_text: 'Harina, leche, azúcar' }));
    const out = await enrich_with_off(mkCtx(mkProduct({ ingredientes_detectados: [] })));
    expect(out.product?.ingredientes_detectados).toEqual(['Harina', 'leche', 'azúcar']);
  });

  it('sube la confianza a ≥0.9 con match por código de barras', async () => {
    decodeMock.mockResolvedValue('7790001112223');
    byBarcodeMock.mockResolvedValue(mkOff());
    const out = await enrich_with_off(mkCtx(mkProduct({ confidence: 0.3 })));
    expect(out.product?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('match por nombre → confianza ≥0.8 (sin pisar si ya era mayor)', async () => {
    decodeMock.mockResolvedValue(null);
    byNameMock.mockResolvedValue(mkOff());
    const out = await enrich_with_off(mkCtx(mkProduct({ barcode: undefined, confidence: 0.3 })));
    expect(out.product?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('sin match no toca el producto', async () => {
    decodeMock.mockResolvedValue(null);
    byNameMock.mockResolvedValue(null);
    const out = await enrich_with_off(mkCtx(mkProduct({ confidence: 0.3, alergenos: [] })));
    expect(out.product?.confidence).toBe(0.3);
    expect(out.product?.alergenos).toEqual([]);
  });
});

describe('enrich_with_off — validación soft barcode↔foto (NL-601)', () => {
  function withBarcodeImage(ctx: AnalysisContext): AnalysisContext {
    ctx.barcodeImage = {
      name: 'bc.jpg',
      mime: 'image/jpeg',
      sizeBytes: 5,
      hash: 'h2',
      buffer: Buffer.from('bc'),
    };
    return ctx;
  }

  it('marca barcodeUnreadable cuando el usuario subió la imagen pero no decodifica', async () => {
    decodeMock.mockResolvedValue(null); // ni la imagen del código ni la foto decodifican
    const out = await enrich_with_off(withBarcodeImage(mkCtx(mkProduct())));
    expect(out.offEnrichment?.barcodeUnreadable).toBe(true);
  });

  it('NO marca barcodeUnreadable si no se subió imagen de código', async () => {
    decodeMock.mockResolvedValue(null);
    const out = await enrich_with_off(mkCtx(mkProduct()));
    expect(out.offEnrichment?.barcodeUnreadable).toBeFalsy();
  });

  it('marca barcodeMismatch cuando el nombre de OFF no se corresponde con la foto', async () => {
    decodeMock.mockResolvedValue('7790001112223'); // imagen del código decodifica
    byBarcodeMock.mockResolvedValue(mkOff({ product_name: 'Coca Cola Original' }));
    const out = await enrich_with_off(
      withBarcodeImage(mkCtx(mkProduct({ producto: 'Yogur Entero Natural' }))),
    );
    expect(out.offEnrichment?.barcodeMismatch).toBe(true);
  });

  it('NO marca barcodeMismatch cuando los nombres se solapan', async () => {
    decodeMock.mockResolvedValue('7790001112223');
    byBarcodeMock.mockResolvedValue(mkOff({ product_name: 'Galletitas Test Chocolate' }));
    const out = await enrich_with_off(
      withBarcodeImage(mkCtx(mkProduct({ producto: 'Galletitas Test' }))),
    );
    expect(out.offEnrichment?.barcodeMismatch).toBe(false);
  });
});

describe('enrich_with_off — fallback OCR del código de barras (NL-601)', () => {
  function withBarcodeImage(ctx: AnalysisContext): AnalysisContext {
    ctx.barcodeImage = {
      name: 'bc.jpg',
      mime: 'image/jpeg',
      sizeBytes: 5,
      hash: 'h2',
      buffer: Buffer.from('bc'),
    };
    return ctx;
  }

  it('usa el OCR cuando zxing no pudo con las barras (foto borrosa)', async () => {
    decodeMock.mockResolvedValue(null); // zxing falla con la imagen del código y la foto
    byBarcodeMock.mockResolvedValue(mkOff({ product_name: 'Galletitas Test' }));
    const out = await enrich_with_off(withBarcodeImage(mkCtx(mkProduct())), mkIa('7793704000911'));
    expect(byBarcodeMock).toHaveBeenCalledWith('7793704000911');
    const trace = out.steps.find((s) => s.name === 'enrich_with_off');
    expect(trace?.details?.barcodeSource).toBe('barcode-image-ocr');
    // Leído por OCR ⇒ ya no es "unreadable".
    expect(out.offEnrichment?.barcodeUnreadable).toBeFalsy();
  });

  it('marca barcodeUnreadable si el OCR tampoco puede leerlo (NONE)', async () => {
    decodeMock.mockResolvedValue(null);
    const out = await enrich_with_off(withBarcodeImage(mkCtx(mkProduct())), mkIa('NONE'));
    expect(byBarcodeMock).not.toHaveBeenCalled();
    expect(out.offEnrichment?.barcodeUnreadable).toBe(true);
  });

  it('descarta una lectura OCR con checksum inválido y queda unreadable', async () => {
    decodeMock.mockResolvedValue(null);
    const out = await enrich_with_off(
      withBarcodeImage(mkCtx(mkProduct())),
      mkIa('7793704000912'), // checksum incorrecto
    );
    expect(byBarcodeMock).not.toHaveBeenCalled();
    expect(out.offEnrichment?.barcodeUnreadable).toBe(true);
  });

  it('sin provider IA no intenta OCR (comportamiento previo)', async () => {
    decodeMock.mockResolvedValue(null);
    const out = await enrich_with_off(withBarcodeImage(mkCtx(mkProduct())));
    expect(out.offEnrichment?.barcodeUnreadable).toBe(true);
  });
});
