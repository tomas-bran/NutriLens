'use client';

/**
 * AnalyzingPanel — UPLOADING and PROCESSING render branches.
 * Pencil reference: `D02 — Loading` two-column body:
 *   - Left: dark preview with scan line (`#0F172A` bg + `#A3E635` line)
 *   - Right: <PipelineStepper>
 */
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { formatFileSize } from '@/lib/format-file-size';
import { PipelineStepper } from './PipelineStepper';
import { PIPELINE_STEPS_COUNT } from './pipeline-steps';
import { useFilePreviewUrl } from './hooks/use-file-preview-url';
import { useSimulatedPipelineStep } from './hooks/use-simulated-pipeline-step';

export interface AnalyzingPanelProps {
  file: File;
  /** NL-601: cuando hay foto del código de barras, escaneamos las dos a la vez. */
  barcodeFile?: File | null;
  progress: number;
  stage: 'UPLOADING' | 'PROCESSING';
}

export function AnalyzingPanel({ file, barcodeFile, progress, stage }: AnalyzingPanelProps) {
  const previewUrl = useFilePreviewUrl(file);
  const barcodePreviewUrl = useFilePreviewUrl(barcodeFile ?? null);
  const percent = Math.round(progress * 100);
  const isImage = file.type.startsWith('image/');
  const currentStepIndex = useSimulatedPipelineStep(stage);
  const hasBarcode = barcodeFile != null;

  return (
    <div
      className="flex flex-col gap-4"
      data-testid={stage === 'UPLOADING' ? 'uploading-state' : 'processing-state'}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-bold text-[var(--color-text)]">
          {hasBarcode ? 'Analizando las dos fotos' : 'Analizando etiqueta'}
        </h2>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          {hasBarcode
            ? 'Leemos el código de barras y el producto juntos.'
            : `${file.name} · ${formatFileSize(file.size)}`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="flex flex-col gap-3">
          {hasBarcode ? (
            <div className="grid grid-cols-2 gap-3" data-testid="dual-scan">
              <PreviewCanvas
                file={barcodeFile}
                previewUrl={barcodePreviewUrl}
                isImage={barcodeFile.type.startsWith('image/')}
                label="Código de barras"
                compact
              />
              <PreviewCanvas
                file={file}
                previewUrl={previewUrl}
                isImage={isImage}
                label="Producto"
                compact
              />
            </div>
          ) : (
            <PreviewCanvas file={file} previewUrl={previewUrl} isImage={isImage} />
          )}
          <ScanProgress
            stage={stage}
            percent={percent}
            step={currentStepIndex}
            fileName={file.name}
          />
        </div>
        <PipelineStepper currentStepIndex={currentStepIndex} />
      </div>
    </div>
  );
}

function ScanProgress({
  stage,
  percent,
  step,
  fileName,
}: {
  stage: 'UPLOADING' | 'PROCESSING';
  percent: number;
  step: number;
  fileName: string;
}) {
  const stepNum = Math.min(step + 1, PIPELINE_STEPS_COUNT);
  const pct = stage === 'UPLOADING' ? percent : Math.round((stepNum / PIPELINE_STEPS_COUNT) * 100);
  const caption =
    stage === 'UPLOADING'
      ? `Subiendo archivo · ${percent}%`
      : `${fileName} · escaneando ${stepNum}/${PIPELINE_STEPS_COUNT}`;
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface)]"
        role="progressbar"
        aria-label="Progreso del análisis"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent-lime)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="truncate font-mono text-[11.5px] text-[var(--color-text-muted)]">{caption}</p>
    </div>
  );
}

interface PreviewCanvasProps {
  file: File;
  previewUrl: string | null;
  isImage: boolean;
  /** Etiqueta opcional (modo dual-scan): "Código de barras" / "Producto". */
  label?: string;
  /** Tile más chico para el layout de dos fotos lado a lado. */
  compact?: boolean;
}

function PreviewCanvas({ file, previewUrl, isImage, label, compact = false }: PreviewCanvasProps) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-[20px] bg-[var(--color-ink-900)]',
        compact ? 'min-h-[180px] p-4' : 'min-h-[360px] p-6 md:p-8',
      )}
      data-testid="analyzing-preview"
    >
      {label && (
        <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/35 border-t-[var(--color-accent-lime)]" />
          {label}
        </span>
      )}
      {isImage && previewUrl ? (
        <Image
          src={previewUrl}
          alt={label ? `Vista previa de ${label.toLowerCase()}` : 'Vista previa de la etiqueta'}
          width={400}
          height={300}
          unoptimized
          className={cn(
            'max-w-full rotate-[-3deg] rounded-[12px] bg-white object-contain shadow-[0_16px_40px_rgba(0,0,0,0.4)]',
            compact ? 'max-h-40 p-2' : 'max-h-72 p-3',
          )}
        />
      ) : (
        <div className="flex h-56 w-72 max-w-full rotate-[-3deg] flex-col items-start gap-2 rounded-[12px] bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
          <p className="text-lg font-bold text-[var(--color-text)]">{file.name}</p>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            PDF · {formatFileSize(file.size)}
          </p>
        </div>
      )}

      <div className="animate-scanline pointer-events-none absolute inset-x-10 top-1/2 h-[3px] origin-center rounded-full bg-[var(--color-accent-lime)] shadow-[0_0_12px_rgba(163,230,53,0.6)]" />
    </div>
  );
}
