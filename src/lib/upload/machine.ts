/**
 * State machine for the upload flow.
 * See `docs/specs/E01-onboarding-y-upload.md §7`.
 *
 *        ┌─────────┐  SELECT       ┌──────────┐
 *  start →│  IDLE   │──────────────→│ SELECTED │
 *        └─────────┘               └────┬─────┘
 *                                       │ SUBMIT
 *                                       ▼
 *                                ┌──────────────┐ FAIL  ┌─────────┐
 *                                │  UPLOADING   │──────→│  ERROR  │
 *                                └──────┬───────┘       └────┬────┘
 *                                       │ UPLOAD_DONE       │ RETRY
 *                                       ▼                   │
 *                                ┌──────────────┐           │
 *                                │  PROCESSING  │           │
 *                                └──────┬───────┘           │
 *                                       │ COMPLETE          │
 *                                       ▼                   │
 *                                ┌──────────────┐           │
 *                                │  COMPLETED   │←──────────┘
 *                                └──────────────┘
 *
 * Pure functions only — no side effects. The owning component handles
 * the actual XHR, hash computation, and router redirect.
 */
import type { ErrorCode } from '@schemas/errors';

export type UploadState =
  | { kind: 'IDLE' }
  | { kind: 'SELECTED'; file: File }
  | { kind: 'UPLOADING'; file: File; progress: number }
  | { kind: 'PROCESSING'; file: File }
  | { kind: 'COMPLETED'; id: string }
  | {
      kind: 'ERROR';
      error: ErrorCode;
      reason: string;
      requestId: string | null;
      /** Last file selected — kept so "Reintentar" can re-submit it. */
      file: File | null;
    };

export type UploadEvent =
  | { type: 'SELECT'; file: File }
  | { type: 'CLEAR' }
  | { type: 'SUBMIT' }
  | { type: 'PROGRESS'; progress: number }
  | { type: 'UPLOAD_DONE' }
  | { type: 'COMPLETE'; id: string }
  | { type: 'FAIL'; error: ErrorCode; reason: string; requestId?: string | null }
  | { type: 'RETRY' };

export const initialState: UploadState = { kind: 'IDLE' };

/**
 * Pure transition. Invalid (state, event) combinations return the same
 * state unchanged — never throw — so a stale UI event can't crash the flow.
 */
export function transition(state: UploadState, event: UploadEvent): UploadState {
  switch (state.kind) {
    case 'IDLE':
      if (event.type === 'SELECT') return { kind: 'SELECTED', file: event.file };
      // Client-side validation can reject a file before it ever leaves IDLE
      // (spec §3 — MIME / size / extension checks). Surface the same ERROR UI.
      if (event.type === 'FAIL')
        return {
          kind: 'ERROR',
          error: event.error,
          reason: event.reason,
          requestId: event.requestId ?? null,
          file: null,
        };
      return state;

    case 'SELECTED':
      if (event.type === 'SELECT') return { kind: 'SELECTED', file: event.file };
      if (event.type === 'CLEAR') return { kind: 'IDLE' };
      if (event.type === 'SUBMIT') return { kind: 'UPLOADING', file: state.file, progress: 0 };
      // A user can pick a new (invalid) file while one is already SELECTED.
      if (event.type === 'FAIL')
        return {
          kind: 'ERROR',
          error: event.error,
          reason: event.reason,
          requestId: event.requestId ?? null,
          file: state.file,
        };
      return state;

    case 'UPLOADING':
      if (event.type === 'PROGRESS')
        return { kind: 'UPLOADING', file: state.file, progress: clampProgress(event.progress) };
      if (event.type === 'UPLOAD_DONE') return { kind: 'PROCESSING', file: state.file };
      if (event.type === 'FAIL')
        return {
          kind: 'ERROR',
          error: event.error,
          reason: event.reason,
          requestId: event.requestId ?? null,
          file: state.file,
        };
      return state;

    case 'PROCESSING':
      if (event.type === 'COMPLETE') return { kind: 'COMPLETED', id: event.id };
      if (event.type === 'FAIL')
        return {
          kind: 'ERROR',
          error: event.error,
          reason: event.reason,
          requestId: event.requestId ?? null,
          file: state.file,
        };
      return state;

    case 'ERROR':
      if (event.type === 'RETRY') return { kind: 'IDLE' };
      if (event.type === 'SELECT') return { kind: 'SELECTED', file: event.file };
      return state;

    case 'COMPLETED':
      // Terminal state. The owning component navigates away; if anything
      // fires after that, ignore it.
      return state;
  }
}

function clampProgress(p: number): number {
  if (Number.isNaN(p)) return 0;
  if (p < 0) return 0;
  if (p > 1) return 1;
  return p;
}
