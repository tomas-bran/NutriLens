/**
 * Unit tests for the upload state machine.
 * Covers every valid transition documented in
 * `docs/specs/E01-onboarding-y-upload.md §7` plus invalid (no-op) ones.
 */
import { describe, expect, it } from 'vitest';
import { initialState, transition, type UploadEvent, type UploadState } from '@/lib/upload/machine';

function mkFile(name = 'a.jpg', type = 'image/jpeg', size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('upload state machine — initialState', () => {
  it('starts in IDLE', () => {
    expect(initialState).toEqual({ kind: 'IDLE' });
  });
});

describe('upload state machine — valid transitions', () => {
  it('IDLE + SELECT → SELECTED', () => {
    const file = mkFile();
    const next = transition({ kind: 'IDLE' }, { type: 'SELECT', file });
    expect(next).toEqual({ kind: 'SELECTED', file });
  });

  it('SELECTED + SELECT → SELECTED with new file', () => {
    const f1 = mkFile('a.jpg');
    const f2 = mkFile('b.png', 'image/png');
    const next = transition({ kind: 'SELECTED', file: f1 }, { type: 'SELECT', file: f2 });
    expect(next).toEqual({ kind: 'SELECTED', file: f2 });
  });

  it('SELECTED + CLEAR → IDLE', () => {
    const next = transition({ kind: 'SELECTED', file: mkFile() }, { type: 'CLEAR' });
    expect(next).toEqual({ kind: 'IDLE' });
  });

  it('SELECTED + SUBMIT → UPLOADING progress=0', () => {
    const file = mkFile();
    const next = transition({ kind: 'SELECTED', file }, { type: 'SUBMIT' });
    expect(next).toEqual({ kind: 'UPLOADING', file, progress: 0 });
  });

  it('UPLOADING + PROGRESS → UPLOADING with updated progress', () => {
    const file = mkFile();
    const next = transition(
      { kind: 'UPLOADING', file, progress: 0 },
      { type: 'PROGRESS', progress: 0.42 },
    );
    expect(next).toEqual({ kind: 'UPLOADING', file, progress: 0.42 });
  });

  it('UPLOADING + UPLOAD_DONE → PROCESSING', () => {
    const file = mkFile();
    const next = transition({ kind: 'UPLOADING', file, progress: 1 }, { type: 'UPLOAD_DONE' });
    expect(next).toEqual({ kind: 'PROCESSING', file });
  });

  it('UPLOADING + FAIL → ERROR with file preserved', () => {
    const file = mkFile();
    const next = transition(
      { kind: 'UPLOADING', file, progress: 0.5 },
      { type: 'FAIL', error: 'model_error', reason: 'boom', requestId: 'rid-1' },
    );
    expect(next).toEqual({
      kind: 'ERROR',
      error: 'model_error',
      reason: 'boom',
      requestId: 'rid-1',
      file,
    });
  });

  it('PROCESSING + COMPLETE → COMPLETED with id', () => {
    const next = transition(
      { kind: 'PROCESSING', file: mkFile() },
      { type: 'COMPLETE', id: 'product-123' },
    );
    expect(next).toEqual({ kind: 'COMPLETED', id: 'product-123' });
  });

  it('PROCESSING + FAIL → ERROR', () => {
    const file = mkFile();
    const next = transition(
      { kind: 'PROCESSING', file },
      { type: 'FAIL', error: 'model_timeout', reason: 'tardó' },
    );
    expect(next).toEqual({
      kind: 'ERROR',
      error: 'model_timeout',
      reason: 'tardó',
      requestId: null,
      file,
    });
  });

  it('ERROR + RETRY → IDLE', () => {
    const next = transition(
      {
        kind: 'ERROR',
        error: 'model_error',
        reason: 'x',
        requestId: null,
        file: mkFile(),
      },
      { type: 'RETRY' },
    );
    expect(next).toEqual({ kind: 'IDLE' });
  });

  it('ERROR + SELECT → SELECTED', () => {
    const file = mkFile('new.png', 'image/png');
    const next = transition(
      {
        kind: 'ERROR',
        error: 'unsupported_file_type',
        reason: 'x',
        requestId: null,
        file: null,
      },
      { type: 'SELECT', file },
    );
    expect(next).toEqual({ kind: 'SELECTED', file });
  });

  it('IDLE + FAIL → ERROR (client-side validation rejecting a file)', () => {
    const next = transition(
      { kind: 'IDLE' },
      { type: 'FAIL', error: 'unsupported_file_type', reason: 'no docx' },
    );
    expect(next).toEqual({
      kind: 'ERROR',
      error: 'unsupported_file_type',
      reason: 'no docx',
      requestId: null,
      file: null,
    });
  });

  it('SELECTED + FAIL → ERROR keeping the previous file (client picks a 2nd, bad file)', () => {
    const prev = mkFile('ok.jpg');
    const next = transition(
      { kind: 'SELECTED', file: prev },
      { type: 'FAIL', error: 'file_too_large', reason: 'demasiado grande' },
    );
    expect(next).toEqual({
      kind: 'ERROR',
      error: 'file_too_large',
      reason: 'demasiado grande',
      requestId: null,
      file: prev,
    });
  });
});

describe('upload state machine — progress clamping', () => {
  it('clamps progress > 1 to 1', () => {
    const file = mkFile();
    const next = transition(
      { kind: 'UPLOADING', file, progress: 0 },
      { type: 'PROGRESS', progress: 1.5 },
    );
    expect(next).toEqual({ kind: 'UPLOADING', file, progress: 1 });
  });

  it('clamps progress < 0 to 0', () => {
    const file = mkFile();
    const next = transition(
      { kind: 'UPLOADING', file, progress: 0.5 },
      { type: 'PROGRESS', progress: -0.1 },
    );
    expect(next).toEqual({ kind: 'UPLOADING', file, progress: 0 });
  });

  it('clamps NaN progress to 0', () => {
    const file = mkFile();
    const next = transition(
      { kind: 'UPLOADING', file, progress: 0.5 },
      { type: 'PROGRESS', progress: Number.NaN },
    );
    expect(next).toEqual({ kind: 'UPLOADING', file, progress: 0 });
  });
});

describe('upload state machine — invalid transitions are no-ops', () => {
  const cases: Array<{ name: string; state: UploadState; event: UploadEvent }> = [
    {
      name: 'IDLE + SUBMIT (no file yet)',
      state: { kind: 'IDLE' },
      event: { type: 'SUBMIT' },
    },
    {
      name: 'IDLE + COMPLETE (no upload in flight)',
      state: { kind: 'IDLE' },
      event: { type: 'COMPLETE', id: 'x' },
    },
    {
      name: 'IDLE + PROGRESS (no upload in flight)',
      state: { kind: 'IDLE' },
      event: { type: 'PROGRESS', progress: 0.5 },
    },
    {
      name: 'SELECTED + COMPLETE (not uploaded yet)',
      state: { kind: 'SELECTED', file: mkFile() },
      event: { type: 'COMPLETE', id: 'x' },
    },
    {
      name: 'UPLOADING + SUBMIT (already submitted)',
      state: { kind: 'UPLOADING', file: mkFile(), progress: 0.5 },
      event: { type: 'SUBMIT' },
    },
    {
      name: 'UPLOADING + COMPLETE (server still processing)',
      state: { kind: 'UPLOADING', file: mkFile(), progress: 1 },
      event: { type: 'COMPLETE', id: 'x' },
    },
    {
      name: 'PROCESSING + PROGRESS (no more bytes to upload)',
      state: { kind: 'PROCESSING', file: mkFile() },
      event: { type: 'PROGRESS', progress: 0.5 },
    },
    {
      name: 'PROCESSING + UPLOAD_DONE (already done)',
      state: { kind: 'PROCESSING', file: mkFile() },
      event: { type: 'UPLOAD_DONE' },
    },
    {
      name: 'COMPLETED + anything → COMPLETED (terminal)',
      state: { kind: 'COMPLETED', id: 'x' },
      event: { type: 'RETRY' },
    },
    {
      name: 'COMPLETED + FAIL → COMPLETED (terminal)',
      state: { kind: 'COMPLETED', id: 'x' },
      event: { type: 'FAIL', error: 'model_error', reason: 'x' },
    },
    {
      name: 'ERROR + SUBMIT (must RETRY or SELECT first)',
      state: {
        kind: 'ERROR',
        error: 'model_error',
        reason: 'x',
        requestId: null,
        file: null,
      },
      event: { type: 'SUBMIT' },
    },
  ];

  for (const { name, state, event } of cases) {
    it(`${name} returns same state`, () => {
      expect(transition(state, event)).toEqual(state);
    });
  }
});

describe('upload state machine — full happy path', () => {
  it('IDLE → SELECTED → UPLOADING → PROCESSING → COMPLETED', () => {
    const file = mkFile();
    let s: UploadState = initialState;
    s = transition(s, { type: 'SELECT', file });
    expect(s.kind).toBe('SELECTED');
    s = transition(s, { type: 'SUBMIT' });
    expect(s.kind).toBe('UPLOADING');
    s = transition(s, { type: 'PROGRESS', progress: 0.5 });
    expect(s).toMatchObject({ kind: 'UPLOADING', progress: 0.5 });
    s = transition(s, { type: 'UPLOAD_DONE' });
    expect(s.kind).toBe('PROCESSING');
    s = transition(s, { type: 'COMPLETE', id: 'abc-123' });
    expect(s).toEqual({ kind: 'COMPLETED', id: 'abc-123' });
  });

  it('SELECTED → UPLOADING → ERROR → RETRY → IDLE', () => {
    const file = mkFile();
    let s: UploadState = { kind: 'SELECTED', file };
    s = transition(s, { type: 'SUBMIT' });
    s = transition(s, {
      type: 'FAIL',
      error: 'model_rate_limited',
      reason: 'demasiado',
      requestId: 'rid-9',
    });
    expect(s).toMatchObject({ kind: 'ERROR', error: 'model_rate_limited', requestId: 'rid-9' });
    s = transition(s, { type: 'RETRY' });
    expect(s).toEqual({ kind: 'IDLE' });
  });
});
