import { PDFParse } from 'pdf-parse';

export async function canReadPdf(buffer: Buffer): Promise<boolean> {
  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const info = await parser.getInfo();
    return info.total > 0;
  } catch {
    return false;
  } finally {
    await parser?.destroy().catch(() => {});
  }
}
