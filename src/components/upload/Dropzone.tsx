'use client';

/**
 * Dropzone — IDLE and SELECTED render branches.
 * Pencil reference: `ekBlR` Component/UploadZone — solid green border,
 * `#F0FDF4` bg, cornerRadius 24, padding 40, gap 20.
 */
import Image from 'next/image';
import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, RefObject } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatFileSize } from '@/lib/format-file-size';
import type { UploadState } from '@/lib/upload/machine';
import { HiddenFileInputs } from './HiddenFileInputs';
import { useFilePreviewUrl } from './hooks/use-file-preview-url';

export interface DropzoneProps {
  state: Extract<UploadState, { kind: 'IDLE' | 'SELECTED' }>;
  onFileSelected: (file: File) => void;
  onSubmit: () => void;
  onClear: () => void;
  cameraInputRef: RefObject<HTMLInputElement | null>;
  galleryInputRef: RefObject<HTMLInputElement | null>;
  pdfInputRef: RefObject<HTMLInputElement | null>;
  /** NL-601: foto opcional del código de barras (estado del padre). */
  barcodeFile: File | null;
  onBarcodeSelected: (file: File) => void;
  onBarcodeClear: () => void;
}

export function Dropzone({
  state,
  onFileSelected,
  onSubmit,
  onClear,
  cameraInputRef,
  galleryInputRef,
  pdfInputRef,
  barcodeFile,
  onBarcodeSelected,
  onBarcodeClear,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const selected = state.kind === 'SELECTED' ? state.file : null;
  // The image preview replaces the cloud badge as the visual anchor; PDFs
  // (no inline preview) keep the badge.
  const showsImagePreview = selected?.type.startsWith('image/') ?? false;

  return (
    <div className="flex flex-col gap-4 lg:h-full">
      {/* ① Código de barras (opcional). NL-601: mejora la precisión cuando OFF
          tiene el producto; el análisis igual avanza sin él. */}
      <BarcodeCaptureSlot file={barcodeFile} onPick={onBarcodeSelected} onClear={onBarcodeClear} />

      {/* ② Foto del producto (requerida). El drag-and-drop alimenta esta foto. */}
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] font-mono text-[11px] font-bold text-white">
          2
        </span>
        <span className="text-[13px] font-bold text-[var(--color-text)]">Foto del producto</span>
        <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
          requerida
        </span>
      </div>
      <div
        data-testid="dropzone"
        onDragOver={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFileSelected(f);
        }}
        style={
          isDragging
            ? undefined
            : { background: 'linear-gradient(160deg, var(--color-primary-soft), #e7faee)' }
        }
        className={cn(
          // Alto: chico en mobile; en desktop estira para igualar el alto del
          // "Pipeline observable" de al lado (grid lg:items-stretch + h-full).
          'relative flex min-h-[260px] flex-1 flex-col items-center justify-center gap-5 overflow-hidden rounded-[24px] border-2 border-dashed p-8 text-center transition-colors lg:min-h-0',
          isDragging
            ? 'border-[var(--color-primary-strong)] bg-[var(--color-risk-low-bg)]'
            : 'border-[var(--color-primary-border)]',
        )}
      >
        <DropzoneSparkles />
        {!showsImagePreview && <CloudUploadBadge />}

        {selected ? (
          <SelectedFilePreview
            file={selected}
            hasBarcode={barcodeFile !== null}
            onSubmit={onSubmit}
            onClear={onClear}
          />
        ) : (
          <IdleControls
            hasBarcode={barcodeFile !== null}
            onCamera={() => cameraInputRef.current?.click()}
            onGallery={() => galleryInputRef.current?.click()}
          />
        )}

        <HiddenFileInputs
          cameraRef={cameraInputRef}
          galleryRef={galleryInputRef}
          pdfRef={pdfInputRef}
          onFileSelected={onFileSelected}
        />
      </div>
    </div>
  );
}

function CloudUploadBadge() {
  // Círculo blanco que "levita" (home-float, respeta reduced-motion).
  return (
    <div
      className="home-float relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-white"
      style={{ boxShadow: '0 10px 26px 0 rgba(22, 163, 74, 0.18)' }}
    >
      <Icon name="upload" strokeWidth={1.9} className="h-14 w-14 text-[var(--color-primary)]" />
    </div>
  );
}

/** PRNG sembrado: estrellitas en posiciones aleatorias (estables entre renders)
 * por toda el área de drag-and-drop. */
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DZ_SPARKLES = (() => {
  const rand = mulberry32(0x5eed);
  return Array.from({ length: 7 }, () => ({
    top: `${Math.round(rand() * 100)}%`,
    left: `${Math.round(rand() * 100)}%`,
    size: Math.round(8 + rand() * 9),
    delay: `${(rand() * 2.6).toFixed(2)}s`,
    duration: `${(2.4 + rand() * 1.8).toFixed(2)}s`,
  }));
})();

function DropzoneSparkles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {DZ_SPARKLES.map((s, i) => (
        <span
          key={i}
          className="nl-twinkle absolute text-[var(--color-primary)]"
          style={{
            top: s.top,
            left: s.left,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        >
          <Icon
            name="sparkles"
            strokeWidth={0}
            fill="currentColor"
            style={{ width: s.size, height: s.size }}
          />
        </span>
      ))}
    </div>
  );
}

function IdleControls({
  hasBarcode,
  onCamera,
  onGallery,
}: {
  hasBarcode: boolean;
  onCamera: () => void;
  onGallery: () => void;
}) {
  return (
    <>
      {/* Si ya cargó el código de barras (opcional) pero falta la foto del
          producto, lo avisamos: sin esa foto el análisis no puede arrancar. */}
      {hasBarcode && (
        <div
          data-testid="product-required-note"
          className="flex items-center gap-2 rounded-full border border-[var(--color-warning)] bg-[var(--color-warning-bg)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--color-warning)]"
        >
          <Icon name="info" strokeWidth={2.2} className="h-4 w-4 flex-shrink-0" />
          Falta la foto del producto para analizar.
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-[var(--color-text)] md:text-xl">
          Arrastrá una foto acá
        </h2>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          O elegí cómo cargar la etiqueta
        </p>
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-3 pt-2"
        data-testid="upload-cta-group"
      >
        <Button onClick={onCamera}>
          <Icon name="camera" strokeWidth={2.25} className="h-4 w-4" />
          Cámara
        </Button>
        <Button variant="ghost" onClick={onGallery}>
          <Icon name="image" strokeWidth={2.25} className="h-4 w-4" />
          Galería
        </Button>
      </div>

      <p
        className="hidden items-center justify-center gap-1.5 text-[12px] text-[var(--color-text-muted)] md:flex"
        data-testid="paste-hint"
      >
        También podés pegar una imagen con
        <kbd className="rounded bg-[var(--color-primary-soft)] px-1.5 py-0.5 font-mono text-[11px]">
          Ctrl+V
        </kbd>
        <span className="text-[var(--color-text-muted)]/70">(⌘V en Mac)</span>
      </p>
    </>
  );
}

function SelectedFilePreview({
  file,
  hasBarcode,
  onSubmit,
  onClear,
}: {
  file: File;
  hasBarcode: boolean;
  onSubmit: () => void;
  onClear: () => void;
}) {
  const previewUrl = useFilePreviewUrl(file);
  return (
    <div className="flex flex-col items-center gap-4" data-testid="selected-file">
      {previewUrl && (
        <Image
          src={previewUrl}
          alt={`Vista previa de ${file.name}`}
          width={400}
          height={300}
          unoptimized
          data-testid="selected-file-preview"
          className="max-h-60 w-auto max-w-full rounded-[12px] bg-white object-contain p-2 shadow-[0_8px_24px_rgba(22,163,74,0.2)]"
        />
      )}
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-[var(--color-text)]">Archivo cargado</p>
        <p className="text-sm text-[var(--color-text-muted)]">{file.name}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {formatFileSize(file.size)} · {file.type}
        </p>
      </div>

      {/* Sin código de barras → el análisis igual corre, pero avisamos que puede
          ser menos preciso (NL-601, decisión de producto). */}
      {!hasBarcode && (
        <p
          data-testid="barcode-missing-note"
          className="flex max-w-xs items-center justify-center gap-1.5 text-[12px] text-[var(--color-text-muted)]"
        >
          <Icon name="info" strokeWidth={2} className="h-3.5 w-3.5 flex-shrink-0" />
          Sin el código de barras el análisis puede ser menos preciso.
        </p>
      )}

      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={onSubmit}>Analizar producto</Button>
        <Button variant="ghost" onClick={onClear}>
          Elegir otro archivo
        </Button>
      </div>
    </div>
  );
}

/**
 * Slot opcional para la foto del código de barras (NL-601). Autocontenido:
 * maneja sus propios inputs ocultos (cámara + galería, solo imágenes) y delega
 * la validación al padre vía `onPick`. Vacío muestra los CTAs; con archivo,
 * un thumbnail + botón para quitar.
 */
function BarcodeCaptureSlot({
  file,
  onPick,
  onClear,
}: {
  file: File | null;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const previewUrl = useFilePreviewUrl(file);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPick(f);
    e.target.value = '';
  };

  return (
    <div
      data-testid="barcode-slot"
      className="flex flex-col gap-3 rounded-[18px] border border-[var(--color-border)] bg-white p-4"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] font-mono text-[11px] font-bold text-white">
          1
        </span>
        <span className="text-[13px] font-bold text-[var(--color-text)]">Código de barras</span>
        <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          opcional
        </span>
      </div>

      {file ? (
        <div className="flex items-center gap-3" data-testid="barcode-selected">
          {previewUrl && (
            <Image
              src={previewUrl}
              alt={`Vista previa del código de barras ${file.name}`}
              width={64}
              height={64}
              unoptimized
              data-testid="barcode-preview"
              className="h-14 w-14 flex-shrink-0 rounded-[10px] bg-[var(--color-surface)] object-cover"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-[13px] font-medium text-[var(--color-text)]">{file.name}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {formatFileSize(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            data-testid="barcode-clear"
            aria-label="Quitar código de barras"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
          >
            <Icon name="close" strokeWidth={2.4} className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Icon
            name="scan-line"
            strokeWidth={1.9}
            className="h-7 w-7 text-[var(--color-primary)]"
          />
          <p className="flex-1 text-[12.5px] text-[var(--color-text-muted)]">
            Enfocá el código de barras del envase para un análisis más preciso.
          </p>
          <div className="flex gap-2" data-testid="barcode-cta-group">
            <Button onClick={() => cameraRef.current?.click()}>
              <Icon name="camera" strokeWidth={2.25} className="h-4 w-4" />
              Cámara
            </Button>
            <Button variant="ghost" onClick={() => galleryRef.current?.click()}>
              <Icon name="image" strokeWidth={2.25} className="h-4 w-4" />
              Galería
            </Button>
          </div>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label="Tomar foto del código de barras"
        onChange={onChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        aria-label="Subir foto del código de barras"
        onChange={onChange}
      />
    </div>
  );
}
