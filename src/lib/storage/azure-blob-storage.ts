/**
 * AzureBlobStorage — el `Storage` de producción (NL-102 / AB#62).
 *
 * Patrón S3-style (decisión con Federico, 2026-06-12):
 *   - `save` sube la imagen a un container PRIVADO y devuelve como `path`
 *     la KEY del blob con prefijo (`blob:<hash>.<ext>`) — eso es lo que se
 *     persiste en `Product.imagenPath`. NUNCA una URL.
 *   - `resolveUrl` se llama al SERVIR (serializers): firma una SAS de
 *     lectura de corta duración (1 h) en forma síncrona (HMAC local, sin
 *     round-trip a Azure).
 *
 * Por qué key + SAS corta y no una SAS larga guardada en la DB:
 *   - Revocable: rotar la account key invalida TODAS las URLs emitidas; con
 *     SAS largas persistidas, la rotación las rompe silenciosamente para
 *     siempre (quedan firmadas con la key vieja).
 *   - Una URL filtrada expira en 1 h, no en años.
 *   - El container queda privado de punta a punta (AC del ticket).
 *
 * Idempotente por hash (mismo contrato que LocalStorage): si el blob ya
 * existe no se re-sube — clave para el dedup-path de `persist`.
 */
import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  type ContainerClient,
} from '@azure/storage-blob';
import { mimeToExtension, type Storage, type StorageSaveResult } from './types';

const SAS_TTL_MS = 60 * 60 * 1000; // 1 hora

export const DEFAULT_BLOB_CONTAINER = 'uploads';
/** Prefijo que marca un `imagenPath` como key de blob (vs. path local). */
export const BLOB_PATH_PREFIX = 'blob:';

export interface AzureBlobStorageDeps {
  /** Inyectables para tests — reemplazan al client/credential reales. */
  containerClient?: ContainerClient;
  credential?: StorageSharedKeyCredential;
}

export class AzureBlobStorage implements Storage {
  private readonly container: ContainerClient;
  private readonly credential: StorageSharedKeyCredential;
  private ensureContainer: Promise<unknown> | null = null;

  constructor(deps: AzureBlobStorageDeps = {}) {
    if (deps.containerClient && deps.credential) {
      this.container = deps.containerClient;
      this.credential = deps.credential;
      return;
    }
    const conn = process.env.AZURE_BLOB_CONNECTION_STRING;
    if (!conn) {
      throw new Error('AzureBlobStorage: falta AZURE_BLOB_CONNECTION_STRING');
    }
    const containerName = process.env.AZURE_BLOB_CONTAINER || DEFAULT_BLOB_CONTAINER;
    const service = BlobServiceClient.fromConnectionString(conn);
    // La SAS se firma localmente: necesitamos la shared key, no un token AAD.
    if (!(service.credential instanceof StorageSharedKeyCredential)) {
      throw new Error(
        'AzureBlobStorage: la connection string no incluye AccountKey (requerida para firmar SAS)',
      );
    }
    this.container = service.getContainerClient(containerName);
    this.credential = service.credential;
  }

  async save(buffer: Buffer, mime: string, hash: string): Promise<StorageSaveResult> {
    this.ensureContainer ??= this.container.createIfNotExists();
    await this.ensureContainer;

    const blobName = `${hash}.${mimeToExtension(mime)}`;
    const blob = this.container.getBlockBlobClient(blobName);

    if (!(await blob.exists())) {
      await blob.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: mime },
      });
    }

    return { path: `${BLOB_PATH_PREFIX}${blobName}`, mime, bytes: buffer.length };
  }

  resolveUrl(path: string): string {
    if (!path.startsWith(BLOB_PATH_PREFIX)) return path;
    const blobName = path.slice(BLOB_PATH_PREFIX.length);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.container.containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn: new Date(Date.now() + SAS_TTL_MS),
      },
      this.credential,
    ).toString();
    return `${this.container.url}/${encodeURIComponent(blobName)}?${sas}`;
  }
}
