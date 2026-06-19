'use client';

/**
 * <UploadFlow> — orchestrator for the upload state machine.
 *
 * Spec: `docs/specs/E01-onboarding-y-upload.md §7`.
 * Wireframes: `D01-Home-Upload` (IDLE/SELECTED) and `D02-Loading`
 * (UPLOADING/PROCESSING).
 *
 * Render branches live in sibling components — this file's job is the
 * state machine, the side effects (XHR, hash, router, toasts) and picking
 * which branch to mount.
 */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AnalyzingPanel } from '@/components/upload/AnalyzingPanel';
import { Dropzone } from '@/components/upload/Dropzone';
import { HiddenFileInputs } from '@/components/upload/HiddenFileInputs';
import { ObservablePipeline } from '@/components/upload/ObservablePipeline';
import { ResultSkeleton } from '@/components/result/ResultSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useToast } from '@/components/ui/Toaster';
import { mapErrorCodeToUi, resolveErrorDescription } from '@/lib/upload/error-ui-mapping';
import { computeFileHash } from '@/lib/upload/hash';
import { initialState, transition, type UploadEvent, type UploadState } from '@/lib/upload/machine';
import { validateClientFile } from '@/lib/upload/validate-client';
import { xhrUpload } from '@/lib/upload/xhr-upload';

function reducer(state: UploadState, event: UploadEvent): UploadState {
  return transition(state, event);
}

export function UploadFlow() {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, dispatch] = useReducer(reducer, initialState);
  // NL-601: foto opcional del código de barras. Vive como estado del componente
  // (no en la FSM): es un acompañante opcional de la foto del producto, no parte
  // del ciclo de vida del upload. Se adjunta al submit y sobrevive a un retry.
  const [barcodeFile, setBarcodeFile] = useState<File | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const errorHeadingRef = useRef<HTMLHeadingElement>(null);

  // Redirect once we hit the terminal COMPLETED state.
  useEffect(() => {
    if (state.kind === 'COMPLETED') {
      router.push(`/analizar/${state.id}`);
    }
  }, [state, router]);

  // A11y: move focus to the error heading when ERROR appears so keyboard
  // and screen-reader users land on the recovery affordances immediately.
  useEffect(() => {
    if (state.kind === 'ERROR') {
      errorHeadingRef.current?.focus();
    }
  }, [state.kind]);

  const handleFileSelected = useCallback(
    (file: File) => {
      const result = validateClientFile(file);
      if (!result.ok) {
        const ui = mapErrorCodeToUi(result.error);
        showToast({ variant: 'error', title: ui.title, description: result.reason });
        dispatch({
          type: 'FAIL',
          error: result.error,
          reason: result.reason,
          requestId: null,
        });
        return;
      }
      dispatch({ type: 'SELECT', file });
    },
    [showToast],
  );

  // Barcode: solo imágenes JPG/PNG (el backend ignora otros formatos). No bloquea
  // el flujo — es opcional — así que un archivo inválido sólo dispara un toast.
  const handleBarcodeSelected = useCallback(
    (file: File) => {
      const result = validateClientFile(file);
      if (!result.ok) {
        const ui = mapErrorCodeToUi(result.error);
        showToast({ variant: 'error', title: ui.title, description: result.reason });
        return;
      }
      if (file.type === 'application/pdf') {
        showToast({
          variant: 'error',
          title: 'Formato no soportado',
          description: 'El código de barras tiene que ser una foto (JPG o PNG).',
        });
        return;
      }
      setBarcodeFile(file);
    },
    [showToast],
  );

  const handleBarcodeClear = useCallback(() => setBarcodeFile(null), []);

  const handleSubmit = useCallback(async () => {
    if (state.kind !== 'SELECTED') return;
    const file = state.file;

    dispatch({ type: 'SUBMIT' });
    showToast({
      variant: 'info',
      title: 'Analizando…',
      description: 'Esto puede tardar unos segundos.',
    });

    let fileHash: string;
    try {
      fileHash = await computeFileHash(file);
    } catch {
      const reason = 'No pudimos preparar el archivo para subirlo.';
      showToast({ variant: 'error', title: 'Algo salió mal', description: reason });
      dispatch({ type: 'FAIL', error: 'internal_error', reason, requestId: null });
      return;
    }

    const result = await xhrUpload({
      file,
      fileHash,
      barcodeImage: barcodeFile ?? undefined,
      onProgress: (progress) => dispatch({ type: 'PROGRESS', progress }),
      onUploadDone: () => dispatch({ type: 'UPLOAD_DONE' }),
    });

    if (result.kind === 'success') {
      showToast({
        variant: 'success',
        title: 'Producto guardado',
        description: 'Lo encontrás en tu catálogo.',
      });
      dispatch({ type: 'COMPLETE', id: result.id });
    } else {
      const ui = mapErrorCodeToUi(result.error);
      showToast({
        variant: 'error',
        title: ui.title,
        description: resolveErrorDescription(result.error, result.reason),
      });
      dispatch({
        type: 'FAIL',
        error: result.error,
        reason: result.reason,
        requestId: result.requestId,
      });
    }
  }, [state, barcodeFile, showToast]);

  // NL-501: global paste listener — active when user hasn't already submitted.
  useEffect(() => {
    const canAcceptPaste =
      state.kind === 'IDLE' || state.kind === 'SELECTED' || state.kind === 'ERROR';
    if (!canAcceptPaste) return;

    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFileSelected(file);
          }
          return;
        }
      }
    }

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [state.kind, handleFileSelected]);

  const handleRetry = useCallback(() => {
    if (state.kind !== 'ERROR') return;
    const ui = mapErrorCodeToUi(state.error);
    if (ui.actionKind === 'retry_same' && state.file) {
      dispatch({ type: 'SELECT', file: state.file });
      return;
    }
    dispatch({ type: 'RETRY' });
    galleryInputRef.current?.click();
  }, [state]);

  const handleNewFile = useCallback(() => {
    dispatch({ type: 'RETRY' });
    galleryInputRef.current?.click();
  }, []);

  // ---- render branches ---------------------------------------------------

  if (state.kind === 'ERROR') {
    const ui = mapErrorCodeToUi(state.error);
    const description = resolveErrorDescription(state.error, state.reason);
    return (
      <div className="flex flex-col gap-3">
        <ErrorState
          icon="!"
          title={ui.title}
          description={description}
          headingRef={errorHeadingRef}
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
        <HiddenFileInputs
          cameraRef={cameraInputRef}
          galleryRef={galleryInputRef}
          pdfRef={pdfInputRef}
          onFileSelected={handleFileSelected}
        />
      </div>
    );
  }

  if (state.kind === 'UPLOADING' || state.kind === 'PROCESSING') {
    return (
      <AnalyzingPanel
        file={state.file}
        barcodeFile={barcodeFile}
        progress={state.kind === 'UPLOADING' ? state.progress : 1}
        stage={state.kind}
      />
    );
  }

  if (state.kind === 'COMPLETED') {
    // No mostramos un "Análisis completado" intermedio: pintamos directamente
    // el esqueleto del resultado como placeholder de donde irá la info. Así el
    // router.push hacia `/analizar/[id]` (cuyo loading.tsx también es el mismo
    // skeleton) encadena sin estados vacíos hasta que monta el ResultView.
    return (
      <div data-testid="completed-state">
        <ResultSkeleton />
      </div>
    );
  }

  // Idle/seleccionado: dropzone (col 1) + pipeline observable (col 2), como en
  // el diseño — el usuario ve qué pasos hará el análisis antes de arrancar.
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-stretch">
      <Dropzone
        state={state}
        onFileSelected={handleFileSelected}
        onSubmit={handleSubmit}
        onClear={() => dispatch({ type: 'CLEAR' })}
        cameraInputRef={cameraInputRef}
        galleryInputRef={galleryInputRef}
        pdfInputRef={pdfInputRef}
        barcodeFile={barcodeFile}
        onBarcodeSelected={handleBarcodeSelected}
        onBarcodeClear={handleBarcodeClear}
      />
      <ObservablePipeline />
    </div>
  );
}
