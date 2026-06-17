'use client';

/**
 * AnalyzingPanel — UPLOADING and PROCESSING render branches.
 * Pencil reference: `D02 — Loading` two-column body:
 *   - Left: dark preview with scan line (`#0F172A` bg + `#A3E635` line)
 *   - Right: <PipelineStepper>
 */
import Image from 'next/image';
import { formatFileSize } from '@/lib/format-file-size';
import { PipelineStepper } from './PipelineStepper';
import { PIPELINE_STEPS_COUNT } from './pipeline-steps';
import { useFilePreviewUrl } from './hooks/use-file-preview-url';
import { useSimulatedPipelineStep } from './hooks/use-simulated-pipeline-step';

export interface AnalyzingPanelProps {
  file: File;
  progress: number;
  stage: 'UPLOADING' | 'PROCESSING';
}

export function AnalyzingPanel({ file, progress, stage }: AnalyzingPanelProps) {
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <PreviewCanvas file={file} previewUrl={previewUrl} isImage={isImage} />
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
}

function PreviewCanvas({ file, previewUrl, isImage }: PreviewCanvasProps) {
  return (
    <div
      className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[20px] bg-[var(--color-ink-900)] p-6 md:p-8"
      data-testid="analyzing-preview"
    >
      {isImage && previewUrl ? (
        <Image
          src={previewUrl}
          alt="Vista previa de la etiqueta"
          width={400}
          height={300}
          unoptimized
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

      <div className="animate-scanline pointer-events-none absolute inset-x-10 top-1/2 h-[3px] origin-center rounded-full bg-[var(--color-accent-lime)] shadow-[0_0_12px_rgba(163,230,53,0.6)]" />
    </div>
  );
}
