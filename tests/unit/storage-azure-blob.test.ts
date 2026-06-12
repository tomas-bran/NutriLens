/**
 * Tests de AzureBlobStorage (NL-102 / AB#62) y de la selección del factory.
 * El client de @azure/storage-blob se inyecta mockeado — acá se verifica el
 * contrato del `Storage` (key persistible, SAS corta al resolver,
 * idempotencia por hash, metadata), no el SDK. La credential sí es real:
 * la firma SAS es HMAC local, no toca la red.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageSharedKeyCredential, type ContainerClient } from '@azure/storage-blob';
import { AzureBlobStorage, BLOB_PATH_PREFIX } from '@/lib/storage/azure-blob-storage';
import { LocalStorage, _resetStorage, getStorage } from '@/lib/storage';

const FAKE_CREDENTIAL = new StorageSharedKeyCredential(
  'testcuenta',
  Buffer.from('clave-de-test').toString('base64'),
);

function makeContainerMock(opts: { blobExists?: boolean } = {}) {
  const blob = {
    exists: vi.fn().mockResolvedValue(opts.blobExists ?? false),
    uploadData: vi.fn().mockResolvedValue({}),
  };
  const container = {
    url: 'https://testcuenta.blob.core.windows.net/uploads',
    containerName: 'uploads',
    createIfNotExists: vi.fn().mockResolvedValue({}),
    getBlockBlobClient: vi.fn().mockReturnValue(blob),
  };
  return { container: container as unknown as ContainerClient, containerRaw: container, blob };
}

function makeStorage(opts: { blobExists?: boolean } = {}) {
  const mocks = makeContainerMock(opts);
  const storage = new AzureBlobStorage({
    containerClient: mocks.container,
    credential: FAKE_CREDENTIAL,
  });
  return { storage, ...mocks };
}

describe('AzureBlobStorage — save', () => {
  it('sube el buffer con el contentType y persiste la KEY (no una URL)', async () => {
    const { storage, containerRaw, blob } = makeStorage();
    const buf = Buffer.from('image bytes');

    const result = await storage.save(buf, 'image/png', 'abc123');

    expect(containerRaw.getBlockBlobClient).toHaveBeenCalledWith('abc123.png');
    expect(blob.uploadData).toHaveBeenCalledWith(buf, {
      blobHTTPHeaders: { blobContentType: 'image/png' },
    });
    expect(result).toEqual({
      path: `${BLOB_PATH_PREFIX}abc123.png`,
      mime: 'image/png',
      bytes: buf.length,
    });
  });

  it('es idempotente por hash: si el blob existe NO re-sube, pero devuelve la misma key', async () => {
    const { storage, blob } = makeStorage({ blobExists: true });

    const result = await storage.save(Buffer.from('x'), 'image/jpeg', 'dedup1');

    expect(blob.uploadData).not.toHaveBeenCalled();
    expect(result.path).toBe(`${BLOB_PATH_PREFIX}dedup1.jpg`);
  });

  it('usa la extensión derivada del MIME (pdf → .pdf, desconocido → .bin)', async () => {
    const { storage, containerRaw } = makeStorage();

    await storage.save(Buffer.from('x'), 'application/pdf', 'h1');
    await storage.save(Buffer.from('x'), 'application/octet-stream', 'h2');

    expect(containerRaw.getBlockBlobClient).toHaveBeenNthCalledWith(1, 'h1.pdf');
    expect(containerRaw.getBlockBlobClient).toHaveBeenNthCalledWith(2, 'h2.bin');
  });

  it('createIfNotExists se llama una sola vez por instancia (memoizado)', async () => {
    const { storage, containerRaw } = makeStorage();

    await storage.save(Buffer.from('a'), 'image/png', 'h1');
    await storage.save(Buffer.from('b'), 'image/png', 'h2');

    expect(containerRaw.createIfNotExists).toHaveBeenCalledTimes(1);
  });

  it('sin connection string ni deps inyectadas, el constructor tira', () => {
    const prev = process.env.AZURE_BLOB_CONNECTION_STRING;
    delete process.env.AZURE_BLOB_CONNECTION_STRING;
    expect(() => new AzureBlobStorage()).toThrow(/AZURE_BLOB_CONNECTION_STRING/);
    if (prev !== undefined) process.env.AZURE_BLOB_CONNECTION_STRING = prev;
  });
});

describe('AzureBlobStorage — resolveUrl (SAS presigned corta)', () => {
  it('firma una SAS de lectura sobre la URL del blob', () => {
    const { storage } = makeStorage();

    const url = storage.resolveUrl(`${BLOB_PATH_PREFIX}abc123.png`);

    expect(url).toContain('https://testcuenta.blob.core.windows.net/uploads/abc123.png?');
    expect(url).toContain('sig=');
    expect(url).toContain('se='); // expiry presente
    expect(url).not.toContain(BLOB_PATH_PREFIX);
  });

  it('cada resolución firma con expiry vigente (no se persiste la URL)', () => {
    const { storage } = makeStorage();
    const url = storage.resolveUrl(`${BLOB_PATH_PREFIX}h.png`);
    const expiry = new URL(url).searchParams.get('se');
    expect(expiry).toBeTruthy();
    // Expira en ~1 h, no en años (el tradeoff del patrón SAS larga).
    const deltaMs = new Date(expiry as string).getTime() - Date.now();
    expect(deltaMs).toBeGreaterThan(50 * 60 * 1000);
    expect(deltaMs).toBeLessThan(70 * 60 * 1000);
  });

  it('paths que no son de blob pasan intactos (rows viejas de LocalStorage)', () => {
    const { storage } = makeStorage();
    expect(storage.resolveUrl('/uploads/analyzed/x.png')).toBe('/uploads/analyzed/x.png');
  });
});

describe('LocalStorage — resolveUrl', () => {
  it('es identidad (el path público ya es la URL)', () => {
    const storage = new LocalStorage('/tmp/x', '/test-uploads');
    expect(storage.resolveUrl('/test-uploads/a.png')).toBe('/test-uploads/a.png');
  });
});

describe('getStorage — selección por env', () => {
  const PREV = process.env.AZURE_BLOB_CONNECTION_STRING;

  beforeEach(() => {
    _resetStorage();
  });

  afterEach(() => {
    if (PREV === undefined) delete process.env.AZURE_BLOB_CONNECTION_STRING;
    else process.env.AZURE_BLOB_CONNECTION_STRING = PREV;
    _resetStorage();
  });

  it('sin AZURE_BLOB_CONNECTION_STRING devuelve LocalStorage', () => {
    delete process.env.AZURE_BLOB_CONNECTION_STRING;
    expect(getStorage()).toBeInstanceOf(LocalStorage);
  });

  it('con connection string válida devuelve AzureBlobStorage', () => {
    process.env.AZURE_BLOB_CONNECTION_STRING =
      'DefaultEndpointsProtocol=https;AccountName=testcuenta;AccountKey=' +
      Buffer.from('clave-de-test').toString('base64') +
      ';EndpointSuffix=core.windows.net';
    expect(getStorage()).toBeInstanceOf(AzureBlobStorage);
  });

  it('con connection string malformada degrada a LocalStorage sin tirar', () => {
    process.env.AZURE_BLOB_CONNECTION_STRING = 'esto-no-es-una-connection-string';
    expect(getStorage()).toBeInstanceOf(LocalStorage);
  });

  it('cachea la instancia entre llamadas', () => {
    delete process.env.AZURE_BLOB_CONNECTION_STRING;
    expect(getStorage()).toBe(getStorage());
  });
});
