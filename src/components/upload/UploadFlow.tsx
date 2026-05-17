'use client';

/**
 * <UploadFlow> — main upload orchestrator.
 * See `docs/specs/E01-onboarding-y-upload.md §7` and wireframes
 * `docs/wireframes/desktop/D01-Home-Upload.png` (IDLE/SELECTED) and
 * `D02-Loading.png` (UPLOADING/PROCESSING).
 *
 * Owns the state machine (`@/lib/upload/machine`). On `SUBMIT` it computes
 * the SHA-256 hash, kicks off the XHR upload, and transitions through
 * UPLOADING (with progress) → PROCESSING → COMPLETED (router redirect)
 * or → ERROR (renders <ErrorState>).
 */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { useToast } from '@/components/ui/Toaster';
import { PipelineStepper } from '@/components/upload/PipelineStepper';
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (state.kind === 'COMPLETED') {
      router.push(`/analizar/${state.id}`);
    }
  }, [state, router]);

  const handleFileSelected = useCallback(
    (file: File) => {
      const result = validateClientFile(file);
      if (!result.ok) {
        const ui = mapErrorCodeToUi(result.error);
        showToast({
          variant: 'error',
          title: ui.title,
          description: result.reason,
        });
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
      dispatch({
        type: 'FAIL',
        error: 'internal_error',
        reason,
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
      showToast({
        variant: 'success',
        title: 'Producto guardado',
        description: 'Lo encontrás en tu historial.',
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
  }, [state, showToast]);

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
        progress={state.kind === 'UPLOADING' ? state.progress : 1}
        stage={state.kind}
      />
    );
  }

  if (state.kind === 'COMPLETED') {
    // Brief flash before the router replaces the page.
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center gap-4 text-center" data-testid="completed-state">
          <p className="text-base font-semibold text-[var(--color-text)]">Análisis completado</p>
        </div>
      </Card>
    );
  }

  return (
    <Dropzone
      state={state}
      isDragging={isDragging}
      onDragChange={setIsDragging}
      onFileSelected={handleFileSelected}
      onSubmit={handleSubmit}
      onClear={() => dispatch({ type: 'CLEAR' })}
      cameraInputRef={cameraInputRef}
      galleryInputRef={galleryInputRef}
      pdfInputRef={pdfInputRef}
    />
  );
}

// ---------------------------------------------------------------------------
// Dropzone (IDLE / SELECTED) — mirrors D01-Home-Upload wireframe
// ---------------------------------------------------------------------------

interface DropzoneProps {
  state: Extract<UploadState, { kind: 'IDLE' | 'SELECTED' }>;
  isDragging: boolean;
  onDragChange: (v: boolean) => void;
  onFileSelected: (file: File) => void;
  onSubmit: () => void;
  onClear: () => void;
  cameraInputRef: RefObject<HTMLInputElement | null>;
  galleryInputRef: RefObject<HTMLInputElement | null>;
  pdfInputRef: RefObject<HTMLInputElement | null>;
}

function Dropzone({
  state,
  isDragging,
  onDragChange,
  onFileSelected,
  onSubmit,
  onClear,
  cameraInputRef,
  galleryInputRef,
  pdfInputRef,
}: DropzoneProps) {
  const selected = state.kind === 'SELECTED' ? state.file : null;

  // Pencil source: `ekBlR` Component/UploadZone — solid green border (NOT dashed),
  // bg #F0FDF4, stroke #86EFAC 2px, cornerRadius 24, padding 40, gap 20.
  return (
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
      style={{ minHeight: 420 }}
      className={[
        'flex flex-col items-center justify-center gap-5 rounded-[24px] border-2 p-10 text-center transition-colors',
        isDragging
          ? 'border-[var(--color-primary-strong)] bg-[#dcfce7]'
          : 'border-[#86efac] bg-[var(--color-primary-soft)]',
      ].join(' ')}
    >
      <CloudUploadIcon />

      {selected ? (
        <SelectedFilePreview file={selected} onSubmit={onSubmit} onClear={onClear} />
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-[var(--color-text)] md:text-xl">
              Arrastrá una foto o PDF acá
            </h2>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              O elegí cómo cargar la etiqueta
            </p>
          </div>

          <div
            className="flex flex-wrap items-center justify-center gap-3 pt-2"
            data-testid="upload-cta-group"
          >
            <Button onClick={() => cameraInputRef.current?.click()}>
              <CameraIcon />
              Cámara
            </Button>
            <Button variant="ghost" onClick={() => galleryInputRef.current?.click()}>
              <GalleryIcon />
              Galería
            </Button>
            <Button variant="ghost" onClick={() => pdfInputRef.current?.click()}>
              <PdfIcon />
              PDF
            </Button>
          </div>
        </>
      )}

      <HiddenFileInputs
        cameraRef={cameraInputRef}
        galleryRef={galleryInputRef}
        pdfRef={pdfInputRef}
        onFileSelected={onFileSelected}
      />
    </div>
  );
}

function SelectedFilePreview({
  file,
  onSubmit,
  onClear,
}: {
  file: File;
  onSubmit: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4" data-testid="selected-file">
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-[var(--color-text)]">Archivo cargado</p>
        <p className="text-sm text-[var(--color-text-muted)]">{file.name}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {formatFileSize(file.size)} · {file.type}
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={onSubmit}>Analizar producto</Button>
        <Button variant="ghost" onClick={onClear}>
          Elegir otro archivo
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnalyzingPanel (UPLOADING / PROCESSING) — mirrors D02-Loading wireframe
// ---------------------------------------------------------------------------

interface AnalyzingPanelProps {
  file: File;
  progress: number;
  stage: 'UPLOADING' | 'PROCESSING';
}

/**
 * Two-column panel mirroring D02-Loading:
 *   - Left: dark image preview with scan line (animation taken from globals).
 *   - Right: <PipelineStepper> showing the 5 backend pipeline stages.
 *
 * The stepper is driven client-side from a simulated timeline. The real
 * server response only marks the terminal redirect — the visual progression
 * is decoupled because the mock provider responds instantly. Spec target
 * times come from E06 §9 (p50 5-8s, p95 <20s).
 */
function AnalyzingPanel({ file, progress, stage }: AnalyzingPanelProps) {
  const previewUrl = useFilePreviewUrl(file);
  const percent = Math.round(progress * 100);
  const isImage = file.type.startsWith('image/');
  const currentStepIndex = useSimulatedPipelineStep(stage);

  return (
    <div
      className="flex flex-col gap-4"
      data-testid={stage === 'UPLOADING' ? 'uploading-state' : 'processing-state'}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-bold text-[var(--color-text)]">Analizando etiqueta</h2>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          {file.name} · {formatFileSize(file.size)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* Left: preview + scan line */}
        <div
          className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[20px] bg-[#0f172a] p-6 md:p-8"
          data-testid="analyzing-preview"
        >
          {isImage && previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Vista previa de la etiqueta"
              className="max-h-72 max-w-full rotate-[-3deg] rounded-[12px] bg-white object-contain p-3 shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
            />
          ) : (
            <div className="flex h-56 w-72 rotate-[-3deg] flex-col items-start gap-2 rounded-[12px] bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
              <p className="text-lg font-bold text-[var(--color-text)]">{file.name}</p>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                PDF · {formatFileSize(file.size)}
              </p>
            </div>
          )}

          <div className="animate-scanline pointer-events-none absolute inset-x-10 top-1/2 h-[3px] origin-center rounded-full bg-[#a3e635] shadow-[0_0_12px_rgba(163,230,53,0.6)]" />

          {stage === 'UPLOADING' && (
            <div className="absolute inset-x-6 bottom-6 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-white/80">
                <span>Subiendo archivo</span>
                <span>{percent}%</span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-white/20"
                role="progressbar"
                aria-label="Progreso del upload"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-white transition-[width] duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: pipeline stepper */}
        <PipelineStepper currentStepIndex={currentStepIndex} />
      </div>
    </div>
  );
}

/**
 * Drives the pipeline stepper visual progression based on elapsed time.
 *
 * Target durations (E06 §9 mid-range, total ~8.6s):
 *   1. Validación de etiqueta        ~0.8s
 *   2. OCR + extracción multimodal   ~4.2s
 *   3. Clasificando alérgenos        ~1.5s
 *   4. Cálculo de riesgo             ~0.5s
 *   5. Generar explicación + guardar ~1.6s
 *
 * While the upload bytes are still in flight (`stage === 'UPLOADING'`),
 * we keep step 1 active. Once the server starts processing we walk the
 * remaining steps on the timeline. The component above transitions to
 * COMPLETED via the COMPLETE event, at which point the stepper is replaced.
 */
function useSimulatedPipelineStep(stage: 'UPLOADING' | 'PROCESSING'): number {
  const [stepIndex, setStepIndex] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (stage !== 'PROCESSING') {
      // While uploading bytes, step 0 (Validación) is the live one.
      setStepIndex(0);
      startedAtRef.current = null;
      return;
    }
    startedAtRef.current = performance.now();
    setStepIndex(1); // entering server processing → step 2 active

    const timeline = [800, 5000, 6500, 7000, 8600];
    const intervalId = window.setInterval(() => {
      if (startedAtRef.current === null) return;
      const elapsed = performance.now() - startedAtRef.current;
      const next = timeline.findIndex((threshold) => elapsed < threshold);
      setStepIndex(next === -1 ? timeline.length - 1 : Math.max(next, 1));
    }, 120);

    return () => window.clearInterval(intervalId);
  }, [stage]);

  return stepIndex;
}

function useFilePreviewUrl(file: File): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file.type.startsWith('image/')) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

// ---------------------------------------------------------------------------
// Shared bits — file inputs (3 distinct accept variants) + icons
// ---------------------------------------------------------------------------

interface HiddenFileInputsProps {
  cameraRef: RefObject<HTMLInputElement | null>;
  galleryRef: RefObject<HTMLInputElement | null>;
  pdfRef: RefObject<HTMLInputElement | null>;
  onFileSelected: (file: File) => void;
}

/**
 * Three separate inputs so each CTA gets the right mobile semantics:
 * Cámara uses `capture="environment"`; Galería filters to images; PDF
 * filters to PDFs. On desktop they all behave like a file picker.
 */
function HiddenFileInputs({
  cameraRef,
  galleryRef,
  pdfRef,
  onFileSelected,
}: HiddenFileInputsProps) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileSelected(f);
    e.target.value = '';
  };
  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label="Tomar foto con la cámara"
        onChange={onChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        aria-label="Subir foto o PDF"
        onChange={onChange}
      />
      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        aria-label="Subir PDF"
        onChange={onChange}
      />
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CloudUploadIcon() {
  // Pencil source: `kx3k0` — 88x88 white circle, drop shadow rgba(22,163,74,0.2)
  // blur 12 y 4, lucide cloud-upload 40x40 fill #16A34A.
  return (
    <div
      className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-white"
      style={{ boxShadow: '0 4px 12px 0 rgba(22, 163, 74, 0.2)' }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-10 w-10 text-[var(--color-primary)]"
      >
        <path d="M12 13v8" />
        <path d="M9 16l3-3 3 3" />
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
      </svg>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M14.5 4l1.5 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2h5z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
