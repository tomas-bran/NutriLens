'use client';

/**
 * Dropzone — IDLE and SELECTED render branches.
 * Pencil reference: `ekBlR` Component/UploadZone — solid green border,
 * `#F0FDF4` bg, cornerRadius 24, padding 40, gap 20.
 */
import Image from 'next/image';
import { useState } from 'react';
import type { DragEvent, RefObject } from 'react';
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
}

export function Dropzone({
  state,
  onFileSelected,
  onSubmit,
  onClear,
  cameraInputRef,
  galleryInputRef,
  pdfInputRef,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const selected = state.kind === 'SELECTED' ? state.file : null;
  // The image preview replaces the cloud badge as the visual anchor; PDFs
  // (no inline preview) keep the badge.
  const showsImagePreview = selected?.type.startsWith('image/') ?? false;

  return (
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
      style={{
        minHeight: 420,
        ...(isDragging
          ? {}
          : { background: 'linear-gradient(160deg, var(--color-primary-soft), #e7faee)' }),
      }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-5 overflow-hidden rounded-[24px] border-2 border-dashed p-10 text-center transition-colors',
        isDragging
          ? 'border-[var(--color-primary-strong)] bg-[var(--color-risk-low-bg)]'
          : 'border-[var(--color-primary-border)]',
      )}
    >
      <DropzoneSparkles />
      {!showsImagePreview && <CloudUploadBadge />}

      {selected ? (
        <SelectedFilePreview file={selected} onSubmit={onSubmit} onClear={onClear} />
      ) : (
        <IdleControls
          onCamera={() => cameraInputRef.current?.click()}
          onGallery={() => galleryInputRef.current?.click()}
          onPdf={() => pdfInputRef.current?.click()}
        />
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

function CloudUploadBadge() {
  // 88x88 white circle que "levita" (home-float, respeta reduced-motion).
  return (
    <div
      className="home-float relative flex h-[88px] w-[88px] items-center justify-center rounded-full bg-white"
      style={{ boxShadow: '0 10px 26px 0 rgba(22, 163, 74, 0.18)' }}
    >
      <Icon
        name="cloud-upload"
        strokeWidth={1.9}
        className="h-10 w-10 text-[var(--color-primary)]"
      />
    </div>
  );
}

/** Estrellitas lima que titilan dentro de la dropzone (decorativo, NL-504). */
const DZ_SPARKLES = [
  { top: '14%', left: '12%', size: 12, delay: '0s' },
  { top: '22%', left: '84%', size: 9, delay: '0.8s' },
  { top: '70%', left: '8%', size: 10, delay: '1.4s' },
  { top: '78%', left: '88%', size: 13, delay: '0.4s' },
  { top: '46%', left: '94%', size: 8, delay: '2s' },
];

function DropzoneSparkles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {DZ_SPARKLES.map((s) => (
        <span
          key={`${s.top}-${s.left}`}
          className="nl-twinkle absolute text-[var(--color-primary)]"
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
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
  onCamera,
  onGallery,
  onPdf,
}: {
  onCamera: () => void;
  onGallery: () => void;
  onPdf: () => void;
}) {
  return (
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
        <Button onClick={onCamera}>
          <Icon name="camera" strokeWidth={2.25} className="h-4 w-4" />
          Cámara
        </Button>
        <Button variant="ghost" onClick={onGallery}>
          <Icon name="image" strokeWidth={2.25} className="h-4 w-4" />
          Galería
        </Button>
        <Button variant="ghost" onClick={onPdf}>
          <Icon name="file-text" strokeWidth={2.25} className="h-4 w-4" />
          PDF
        </Button>
      </div>

      <p
        className="hidden text-[12px] text-[var(--color-text-muted)] md:block"
        data-testid="paste-hint"
      >
        o pegá con{' '}
        <kbd className="rounded bg-[var(--color-primary-soft)] px-1 py-0.5 font-mono text-[11px]">
          Ctrl+V
        </kbd>
        {' / '}
        <kbd className="rounded bg-[var(--color-primary-soft)] px-1 py-0.5 font-mono text-[11px]">
          ⌘V
        </kbd>
      </p>
    </>
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
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={onSubmit}>Analizar producto</Button>
        <Button variant="ghost" onClick={onClear}>
          Elegir otro archivo
        </Button>
      </div>
    </div>
  );
}
