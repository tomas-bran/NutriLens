/**
 * Storage factory. Picks AzureBlobStorage when la connection string está
 * configurada (prod/demo, NL-102); LocalStorage en dev/CI.
 */
import { logger } from '@/lib/logger';
import { AzureBlobStorage } from './azure-blob-storage';
import { LocalStorage } from './local-storage';
import type { Storage } from './types';

let cached: Storage | null = null;

export function getStorage(): Storage {
  if (cached) return cached;
  if (process.env.AZURE_BLOB_CONNECTION_STRING) {
    try {
      cached = new AzureBlobStorage();
      return cached;
    } catch (err) {
      // Connection string malformada: preferimos degradar a LocalStorage
      // (la app sigue funcionando, las imágenes no persisten entre deploys)
      // antes que tirar 500 en cada análisis. El error queda logueado para
      // que la misconfig no pase silenciosa.
      logger.error('storage.azure_init_failed', {
        message: err instanceof Error ? err.message : 'unknown',
      });
    }
  }
  cached = new LocalStorage();
  return cached;
}

/**
 * Traduce un `imagenPath` persistido a URL servible (SAS corta para blobs,
 * identidad para paths locales). Usar en serializers, nunca persistir.
 */
export function resolveImageUrl(path: string): string {
  return getStorage().resolveUrl(path);
}

/** Test-only: reset the singleton so swapping env vars in tests works. */
export function _resetStorage(): void {
  cached = null;
}

export { AzureBlobStorage } from './azure-blob-storage';
export { LocalStorage } from './local-storage';
export { mimeToExtension } from './types';
export type { Storage } from './types';
