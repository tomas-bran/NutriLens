/**
 * Storage abstraction for product images. See spec E04 §4.
 *
 *   - LocalStorage (dev): writes to ./uploads/<hash>.<ext>, returns "/uploads/<hash>.<ext>".
 *   - AzureBlobStorage (demo): writes to a container, returns a SAS-signed URL.
 *
 * Implementations live in sibling files; selection is made by the factory
 * in `./index.ts` based on env vars.
 */
export interface Storage {
  /**
   * Persist the file and return a path/URL usable as `imagenPath` in the DB
   * and as `imagenUrl` in the API response.
   */
  save(buffer: Buffer, mime: string, hash: string): Promise<string>;
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
