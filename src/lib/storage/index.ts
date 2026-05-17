/**
 * Storage factory. Picks LocalStorage in dev/CI; AzureBlobStorage when the
 * blob connection string is configured (lands with the deployment story).
 */
import { LocalStorage } from './local-storage';
import type { Storage } from './types';

let cached: Storage | null = null;

export function getStorage(): Storage {
  if (cached) return cached;
  if (process.env.AZURE_BLOB_CONNECTION_STRING) {
    // TODO(deployment): instantiate real AzureBlobStorage. For now we
    // intentionally fall back to LocalStorage so dev + CI keep working,
    // and surface the configured-but-unused env var as a warning rather
    // than crashing on startup.
    // eslint-disable-next-line no-console
    console.warn(
      '[storage] AZURE_BLOB_CONNECTION_STRING is set but AzureBlobStorage is not implemented yet — falling back to LocalStorage.',
    );
  }
  cached = new LocalStorage();
  return cached;
}

/** Test-only: reset the singleton so swapping env vars in tests works. */
export function _resetStorage(): void {
  cached = null;
}

export { LocalStorage } from './local-storage';
export { mimeToExtension } from './types';
export type { Storage } from './types';
