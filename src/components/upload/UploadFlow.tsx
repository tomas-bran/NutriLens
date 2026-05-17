'use client';

/**
 * <UploadFlow> — main upload orchestrator.
 * See `docs/specs/E01-onboarding-y-upload.md §7`.
 *
 * Owns the state machine (`@/lib/upload/machine`). On `SUBMIT` it computes
 * the SHA-256 hash, kicks off the XHR upload, and transitions through
 * UPLOADING (with progress) → PROCESSING → COMPLETED (router redirect)
 * or → ERROR (renders <ErrorState>).
 */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Spinner } from '@/components/ui/Spinner';
import {
  mapErrorCodeToUi,
  resolveErrorDescription,
} from '@/lib/upload/error-ui-mapping';
import { computeFileHash } from '@/lib/upload/hash';
import {
  initialState,
  transition,
  type UploadEvent,
  type UploadState,
} from '@/lib/upload/machine';
import { validateClientFile } from '@/lib/upload/validate-client';
import { xhrUpload } from '@/lib/upload/xhr-upload';

function reducer(state: UploadState, event: UploadEvent): UploadState {
  return transition(state, event);
}

export function UploadFlow() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (state.kind === 'COMPLETED') {
      router.push(`/analizar/${state.id}`);
    }
  }, [state, router]);

  const handleFileSelected = useCallback((file: File) => {
    const result = validateClientFile(file);
    if (!result.ok) {
      dispatch({
        type: 'FAIL',
        error: result.error,
        reason: result.reason,
        requestId: null,
      });
      return;
    }
    dispatch({ type: 'SELECT', file });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (state.kind !== 'SELECTED') return;
    const file = state.file;

    dispatch({ type: 'SUBMIT' });

    let fileHash: string;
    try {
      fileHash = await computeFileHash(file);
    } catch {
      dispatch({
        type: 'FAIL',
        error: 'internal_error',
        reason: 'No pudimos preparar el archivo para subirlo.',
        requestId: null,
      });
      return;
    }

    const result = await xhrUpload({
      file,
      fileHash,
      onProgress: (progress) => dispatch({ type: 'PROGRESS', progress }),
      onUploadDone: () => dispatch({ type: 'UPLOAD_DONE' }),
    });

    if (result.kind === 'success') {
      dispatch({ type: 'COMPLETE', id: result.id });
    } else {
      dispatch({
        type: 'FAIL',
        error: result.error,
        reason: result.reason,
        requestId: result.requestId,
      });
    }
  }, [state]);

  const handleRetry = useCallback(() => {
    if (state.kind !== 'ERROR') return;
    const ui = mapErrorCodeToUi(state.error);

    if (ui.actionKind === 'retry_same' && state.file) {
      // Reuse the same file — go back to SELECTED, then SUBMIT.
      dispatch({ type: 'SELECT', file: state.file });
      return;
    }
    dispatch({ type: 'RETRY' });
    // Trigger the file picker so the user can pick another file.
    fileInputRef.current?.click();
  }, [state]);

  const handleNewFile = useCallback(() => {
    dispatch({ type: 'RETRY' });
    fileInputRef.current?.click();
  }, []);

  // ---- render branches ----

  if (state.kind === 'ERROR') {
    const ui = mapErrorCodeToUi(state.error);
    const description = resolveErrorDescription(state.error, state.reason);

    return (
      <div className="flex flex-col gap-3">
        <ErrorState
          icon="!"
          title={ui.title}
          description={description}
          primaryAction={{ label: ui.primaryActionLabel, onClick: handleRetry }}
          {...(ui.secondaryActionLabel
            ? { secondaryAction: { label: ui.secondaryActionLabel, onClick: handleNewFile } }
            : {})}
        />
        {state.requestId && (
          <p className="text-center text-xs text-[var(--color-text-muted)]">
            ID de la solicitud: <code className="font-mono">{state.requestId}</code>
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          aria-label="Subir foto o PDF"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelected(f);
            e.target.value = '';
          }}
        />
      </div>
    );
  }

  if (state.kind === 'UPLOADING') {
    const percent = Math.round(state.progress * 100);
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center gap-4 text-center" data-testid="uploading-state">
          <Spinner size="lg" label="Subiendo archivo" />
          <p className="text-base font-semibold text-[var(--color-text)]">Subiendo archivo…</p>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface)]"
            role="progressbar"
            aria-label="Progreso del upload"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-[var(--color-primary)] transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">{percent}%</p>
        </div>
      </Card>
    );
  }

  if (state.kind === 'PROCESSING') {
    return (
      <Card padding="lg">
        <div
          className="flex flex-col items-center gap-4 text-center"
          data-testid="processing-state"
          role="status"
          aria-live="polite"
        >
          <Spinner size="lg" label="Procesando imagen" />
          <p className="text-base font-semibold text-[var(--color-text)]">Procesando imagen…</p>
          <p className="text-sm text-[var(--color-text-muted)]">Esto suele tardar 8–15 segundos</p>
        </div>
      </Card>
    );
  }

  if (state.kind === 'COMPLETED') {
    // Brief flash before the router replaces the page.
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center gap-4 text-center" data-testid="completed-state">
          <Spinner size="lg" label="Análisis completado" />
          <p className="text-base font-semibold text-[var(--color-text)]">Análisis completado</p>
        </div>
      </Card>
    );
  }

  // IDLE or SELECTED — render the dropzone + (optionally) the preview.
  return (
    <Dropzone
      state={state}
      isDragging={isDragging}
      onDragChange={setIsDragging}
      onFileSelected={handleFileSelected}
      onSubmit={handleSubmit}
      onClear={() => dispatch({ type: 'CLEAR' })}
      fileInputRef={fileInputRef}
    />
  );
}

interface DropzoneProps {
  state: Extract<UploadState, { kind: 'IDLE' | 'SELECTED' }>;
  isDragging: boolean;
  onDragChange: (v: boolean) => void;
  onFileSelected: (file: File) => void;
  onSubmit: () => void;
  onClear: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

function Dropzone({
  state,
  isDragging,
  onDragChange,
  onFileSelected,
  onSubmit,
  onClear,
  fileInputRef,
}: DropzoneProps) {
  const selected = state.kind === 'SELECTED' ? state.file : null;

  return (
    <Card padding="lg">
      <div
        data-testid="dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          onDragChange(true);
        }}
        onDragLeave={() => onDragChange(false)}
        onDrop={(e) => {
          e.preventDefault();
          onDragChange(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFileSelected(f);
        }}
        className={[
          'flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragging
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
            : 'border-[var(--color-border)] bg-white',
        ].join(' ')}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-3xl text-[var(--color-primary)]">
          <span aria-hidden="true">↑</span>
        </div>

        {selected ? (
          <>
            <div className="flex flex-col gap-1" data-testid="selected-file">
              <p className="font-semibold text-[var(--color-text)]">Archivo cargado</p>
              <p className="text-sm text-[var(--color-text-muted)]">{selected.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {(selected.size / 1024).toFixed(1)} KB · {selected.type}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Button onClick={onSubmit}>Analizar producto</Button>
              <Button variant="ghost" onClick={onClear}>
                Elegir otro archivo
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-[var(--color-text)]">Arrastrá una foto o PDF acá</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                O elegí cómo cargar la etiqueta
              </p>
            </div>
            <Button onClick={() => fileInputRef.current?.click()}>Subir foto o PDF</Button>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          aria-label="Subir foto o PDF"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelected(f);
            e.target.value = '';
          }}
        />
      </div>
    </Card>
  );
}
