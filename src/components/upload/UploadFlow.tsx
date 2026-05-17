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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
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

function AnalyzingPanel({ file, progress, stage }: AnalyzingPanelProps) {
  const previewUrl = useFilePreviewUrl(file);
  const percent = Math.round(progress * 100);
  const isImage = file.type.startsWith('image/');

  return (
    <div
      className="flex flex-col gap-4"
      data-testid={stage === 'UPLOADING' ? 'uploading-state' : 'processing-state'}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Analizando etiqueta</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {file.name} · {formatFileSize(file.size)}
        </p>
      </div>

      <div
        className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-primary)] p-8"
        data-testid="analyzing-preview"
      >
        {isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Vista previa de la etiqueta"
            className="max-h-72 max-w-full rotate-[-4deg] rounded-lg bg-white object-contain p-3 shadow-2xl"
          />
        ) : (
          <div className="flex h-56 w-72 rotate-[-4deg] flex-col items-start gap-2 rounded-lg bg-white p-4 shadow-2xl">
            <p className="text-lg font-bold text-[var(--color-text)]">{file.name}</p>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              PDF · {formatFileSize(file.size)}
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-6 top-1/2 h-[3px] origin-center animate-scanline rounded-full bg-[var(--color-warning)] shadow-[0_0_12px_rgba(242,165,38,0.7)]" />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-base font-semibold text-[var(--color-text)]">
          {stage === 'UPLOADING' ? 'Subiendo archivo…' : 'Procesando etiqueta'}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {stage === 'UPLOADING'
            ? 'Estamos enviando la imagen al servidor.'
            : 'Esto suele tardar 8–15 segundos.'}
        </p>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface)]"
          role="progressbar"
          aria-label="Progreso del upload"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={[
              'h-full transition-[width] duration-300',
              stage === 'UPLOADING'
                ? 'bg-[var(--color-primary)]'
                : 'animate-pulse bg-[var(--color-primary)]',
            ].join(' ')}
            style={{ width: stage === 'UPLOADING' ? `${percent}%` : '100%' }}
          />
        </div>
      </div>
    </div>
  );
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
