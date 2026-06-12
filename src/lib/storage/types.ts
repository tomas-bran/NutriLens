/**
 * Storage abstraction for product images. See spec E04 §4.
 *
 *   - LocalStorage (dev): writes to public/uploads/analyzed/<hash>.<ext>,
 *     returns "/uploads/analyzed/<hash>.<ext>".
 *   - AzureBlobStorage (demo): writes to a container, returns a SAS URL.
 *
 * Implementations live in sibling files; selection is made by the factory
 * in `./index.ts` based on env vars.
 */
export interface StorageSaveResult {
  /** Public path/URL stored as `imagenPath` and used by the UI. */
  path: string;
  /** MIME type as received from the upload (echoed back for DB metadata). */
  mime: string;
  /** Final byte size persisted (== buffer.length para LocalStorage). */
  bytes: number;
}

export interface Storage {
  /**
   * Persist the file and return its metadata. `path` se guarda como
   * `imagenPath`; `mime` + `bytes` se guardan en columnas dedicadas para
   * que podamos mover los archivos a cloud sin perder la metadata.
   */
  save(buffer: Buffer, mime: string, hash: string): Promise<StorageSaveResult>;

  /**
   * Traduce el `imagenPath` persistido a una URL servible por la UI.
   * LocalStorage: identidad (el path público ya es la URL). AzureBlob:
   * firma una SAS de lectura corta (sync, HMAC local). Se llama al
   * serializar cada response — nunca persistir su resultado.
   */
  resolveUrl(path: string): string;
}

/**
 * Map an image MIME to the on-disk extension. Centralised so the same
 * convention applies to storage writes and to URL generation.
 */
export function mimeToExtension(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'application/pdf':
      return 'pdf';
    default:
      // Fall back to "bin" so we never write a file without an extension.
      return 'bin';
  }
}
