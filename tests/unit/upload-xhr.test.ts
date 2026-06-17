/**
 * Unit tests for the XHR upload helper.
 * Mocks XMLHttpRequest via `xhrFactory` so we can drive each branch
 * (success / error / timeout / malformed response) deterministically.
 */
import { describe, expect, it, vi } from 'vitest';
import { xhrUpload } from '@/lib/upload/xhr-upload';

interface FakeXhrInit {
  status: number;
  responseText: string;
  /** Header map for `getResponseHeader` calls. Keys lowercased. */
  responseHeaders?: Record<string, string>;
  /** Trigger which event after `send` is called. */
  trigger: 'load' | 'error' | 'timeout';
  /** Optional progress steps to emit on upload.onprogress (loaded/total pairs). */
  progressSteps?: Array<{ loaded: number; total: number; lengthComputable?: boolean }>;
  /** If false, skip calling upload.onload (so onUploadDone isn't fired). */
  fireUploadOnload?: boolean;
}

function makeFakeXhr(init: FakeXhrInit): XMLHttpRequest {
  const headers = init.responseHeaders ?? {};
  const xhr = {
    upload: {
      onprogress: null as ((e: ProgressEvent) => void) | null,
      onload: null as (() => void) | null,
    },
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    ontimeout: null as (() => void) | null,
    status: 0,
    responseText: '',
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    getResponseHeader: vi.fn((name: string) => headers[name.toLowerCase()] ?? null),
    send: vi.fn(function send(this: typeof xhr) {
      // Emit progress events synchronously, then the terminal event.
      for (const step of init.progressSteps ?? []) {
        this.upload.onprogress?.({
          loaded: step.loaded,
          total: step.total,
          lengthComputable: step.lengthComputable ?? true,
        } as ProgressEvent);
      }

      if ((init.fireUploadOnload ?? true) && init.trigger === 'load') {
        this.upload.onload?.();
      }

      // Defer the terminal callback so the promise's `then` handlers attach
      // before resolution; simpler to just call synchronously here.
      this.status = init.status;
      this.responseText = init.responseText;
      if (init.trigger === 'load') this.onload?.();
      else if (init.trigger === 'error') this.onerror?.();
      else if (init.trigger === 'timeout') this.ontimeout?.();
    }),
  };
  return xhr as unknown as XMLHttpRequest;
}

const TEST_FILE = new File([new Uint8Array(8)], 'a.jpg', { type: 'image/jpeg' });
const TEST_HASH = 'a'.repeat(64);

describe('xhrUpload — success', () => {
  it('resolves with id and requestId on 200 OK', async () => {
    const onProgress = vi.fn();
    const onUploadDone = vi.fn();

    const result = await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress,
      onUploadDone,
      xhrFactory: () =>
        makeFakeXhr({
          status: 200,
          responseText: JSON.stringify({ id: 'product-42' }),
          responseHeaders: { 'x-request-id': 'rid-1' },
          trigger: 'load',
        }),
    });

    expect(result).toEqual({ kind: 'success', id: 'product-42', requestId: 'rid-1' });
    expect(onUploadDone).toHaveBeenCalledOnce();
  });

  it('emits progress callbacks while uploading', async () => {
    const onProgress = vi.fn();

    await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress,
      onUploadDone: vi.fn(),
      xhrFactory: () =>
        makeFakeXhr({
          status: 200,
          responseText: JSON.stringify({ id: 'x' }),
          trigger: 'load',
          progressSteps: [
            { loaded: 250, total: 1000 },
            { loaded: 750, total: 1000 },
          ],
        }),
    });

    expect(onProgress).toHaveBeenCalledWith(0.25);
    expect(onProgress).toHaveBeenCalledWith(0.75);
    // upload.onload bumps to 1
    expect(onProgress).toHaveBeenCalledWith(1);
  });

  it('skips progress callbacks when length is not computable', async () => {
    const onProgress = vi.fn();

    await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress,
      onUploadDone: vi.fn(),
      xhrFactory: () =>
        makeFakeXhr({
          status: 200,
          responseText: JSON.stringify({ id: 'x' }),
          trigger: 'load',
          progressSteps: [{ loaded: 100, total: 0, lengthComputable: false }],
        }),
    });

    // Only the final upload.onload fires onProgress(1)
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(1);
  });
});

describe('xhrUpload — error responses', () => {
  it('maps a 400 + structured body to the error code', async () => {
    const result = await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress: vi.fn(),
      onUploadDone: vi.fn(),
      xhrFactory: () =>
        makeFakeXhr({
          status: 400,
          responseText: JSON.stringify({
            error: 'unsupported_file_type',
            reason: 'Formato no soportado.',
          }),
          responseHeaders: { 'x-request-id': 'rid-2' },
          trigger: 'load',
        }),
    });
    expect(result).toEqual({
      kind: 'error',
      error: 'unsupported_file_type',
      reason: 'Formato no soportado.',
      requestId: 'rid-2',
    });
  });

  it('maps a 422 image_not_supported response', async () => {
    const result = await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress: vi.fn(),
      onUploadDone: vi.fn(),
      xhrFactory: () =>
        makeFakeXhr({
          status: 422,
          responseText: JSON.stringify({
            error: 'image_not_supported',
            reason: 'La imagen no parece corresponder a una etiqueta alimentaria.',
          }),
          trigger: 'load',
        }),
    });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') expect(result.error).toBe('image_not_supported');
  });

  it('maps a 429 to model_rate_limited', async () => {
    const result = await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress: vi.fn(),
      onUploadDone: vi.fn(),
      xhrFactory: () =>
        makeFakeXhr({
          status: 429,
          responseText: JSON.stringify({ error: 'model_rate_limited', reason: 'rate' }),
          trigger: 'load',
        }),
    });
    if (result.kind === 'error') expect(result.error).toBe('model_rate_limited');
    else throw new Error('expected error');
  });

  it('falls back to internal_error when 5xx has malformed body', async () => {
    const result = await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress: vi.fn(),
      onUploadDone: vi.fn(),
      xhrFactory: () =>
        makeFakeXhr({
          status: 500,
          responseText: '<html>oops</html>',
          trigger: 'load',
        }),
    });
    if (result.kind === 'error') expect(result.error).toBe('internal_error');
    else throw new Error('expected error');
  });

  it('falls back to unsupported_file_type on a 4xx with no body', async () => {
    const result = await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress: vi.fn(),
      onUploadDone: vi.fn(),
      xhrFactory: () =>
        makeFakeXhr({
          status: 400,
          responseText: '',
          trigger: 'load',
        }),
    });
    if (result.kind === 'error') expect(result.error).toBe('unsupported_file_type');
    else throw new Error('expected error');
  });

  it('rejects with internal_error when 200 OK has no id field', async () => {
    const result = await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress: vi.fn(),
      onUploadDone: vi.fn(),
      xhrFactory: () =>
        makeFakeXhr({
          status: 200,
          responseText: JSON.stringify({ unexpected: true }),
          trigger: 'load',
        }),
    });
    if (result.kind === 'error') expect(result.error).toBe('internal_error');
    else throw new Error('expected error');
  });
});

describe('xhrUpload — network failure and timeout', () => {
  it('returns internal_error when the network errors out', async () => {
    const result = await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress: vi.fn(),
      onUploadDone: vi.fn(),
      xhrFactory: () =>
        makeFakeXhr({
          status: 0,
          responseText: '',
          trigger: 'error',
        }),
    });
    if (result.kind === 'error') {
      expect(result.error).toBe('internal_error');
      expect(result.reason).toContain('conectar');
    } else throw new Error('expected error');
  });

  it('returns model_timeout when the request times out', async () => {
    const result = await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress: vi.fn(),
      onUploadDone: vi.fn(),
      xhrFactory: () =>
        makeFakeXhr({
          status: 0,
          responseText: '',
          responseHeaders: { 'x-request-id': 'rid-t' },
          trigger: 'timeout',
        }),
    });
    if (result.kind === 'error') {
      expect(result.error).toBe('model_timeout');
      expect(result.requestId).toBe('rid-t');
    } else throw new Error('expected error');
  });
});

describe('xhrUpload — request setup', () => {
  it('sets the X-File-Hash header and posts to /api/analyze', async () => {
    let captured!: XMLHttpRequest & {
      open: ReturnType<typeof vi.fn>;
      setRequestHeader: ReturnType<typeof vi.fn>;
    };
    await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress: vi.fn(),
      onUploadDone: vi.fn(),
      xhrFactory: () => {
        const x = makeFakeXhr({
          status: 200,
          responseText: JSON.stringify({ id: 'x' }),
          trigger: 'load',
        });
        captured = x as unknown as typeof captured;
        return x;
      },
    });
    expect(captured.open).toHaveBeenCalledWith('POST', '/api/analyze');
    expect(captured.setRequestHeader).toHaveBeenCalledWith('X-File-Hash', TEST_HASH);
  });

  it('appends barcodeImage to the multipart when provided (NL-601)', async () => {
    let captured!: XMLHttpRequest & { send: ReturnType<typeof vi.fn> };
    const barcode = new File([new Uint8Array(4)], 'barcode.jpg', { type: 'image/jpeg' });
    await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      barcodeImage: barcode,
      onProgress: vi.fn(),
      onUploadDone: vi.fn(),
      xhrFactory: () => {
        const x = makeFakeXhr({ status: 200, responseText: '{"id":"x"}', trigger: 'load' });
        captured = x as unknown as typeof captured;
        return x;
      },
    });
    const fd = captured.send.mock.calls[0]![0] as FormData;
    const sent = fd.get('barcodeImage');
    expect(sent).toBeInstanceOf(File);
    expect((sent as File).name).toBe('barcode.jpg');
  });

  it('omits barcodeImage from the multipart when not provided', async () => {
    let captured!: XMLHttpRequest & { send: ReturnType<typeof vi.fn> };
    await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress: vi.fn(),
      onUploadDone: vi.fn(),
      xhrFactory: () => {
        const x = makeFakeXhr({ status: 200, responseText: '{"id":"x"}', trigger: 'load' });
        captured = x as unknown as typeof captured;
        return x;
      },
    });
    const fd = captured.send.mock.calls[0]![0] as FormData;
    expect(fd.get('barcodeImage')).toBeNull();
    expect(fd.get('file')).toBeInstanceOf(File);
  });

  // US-39: hard client timeout so the browser never hangs.
  it('sets xhr.timeout to 30_000ms', async () => {
    let capturedTimeout = 0;
    const fakeXhr = makeFakeXhr({
      status: 200,
      responseText: JSON.stringify({ id: 'x' }),
      trigger: 'load',
    });
    const xhrWithTimeout = new Proxy(fakeXhr, {
      set(target, prop, value) {
        if (prop === 'timeout') capturedTimeout = value as number;
        (target as unknown as Record<PropertyKey, unknown>)[prop] = value;
        return true;
      },
    });
    await xhrUpload({
      file: TEST_FILE,
      fileHash: TEST_HASH,
      onProgress: vi.fn(),
      onUploadDone: vi.fn(),
      xhrFactory: () => xhrWithTimeout,
    });
    expect(capturedTimeout).toBe(30_000);
  });
});
