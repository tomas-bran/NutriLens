/**
 * <PipelineStepper> — vertical 5-step panel used inside <AnalyzingPanel>.
 *
 * Pencil reference: `D02 — Loading` right column (`sI4Fp` dlSide2):
 *   - Done step: bg `#D1FAE5`, green check on `#10B981` 32px circle
 *   - Active step: white bg + green stroke 2px + spinner arc icon
 *   - Pending step: white bg + ink-200 border + muted icon
 *
 * The states are driven by `currentStepIndex`. Order matches the spec
 * (E06 §3 / pipelineTrace.StepName order).
 */
import type { ReactNode } from 'react';

export type PipelineStepStatus = 'done' | 'active' | 'pending';

export interface PipelineStep {
  id: string;
  title: string;
  /** Optional secondary line — used by the active step in the wireframe. */
  subtitle?: string;
  icon: 'check' | 'shield' | 'sparkles';
}

const STEPS: ReadonlyArray<PipelineStep> = [
  { id: 'validate', title: 'Validación de etiqueta', icon: 'check' },
  { id: 'extract', title: 'OCR + extracción multimodal', icon: 'check' },
  {
    id: 'allergens',
    title: 'Clasificando alérgenos…',
    subtitle: 'Identificando ingredientes y sellos.',
    icon: 'check',
  },
  { id: 'risk', title: 'Cálculo de riesgo', icon: 'shield' },
  { id: 'explain', title: 'Generar explicación + guardar', icon: 'sparkles' },
];

export const PIPELINE_STEPS_COUNT = STEPS.length;

export interface PipelineStepperProps {
  /**
   * Index of the step currently in progress.
   * 0..STEPS.length-1 → that step is `active`, all before are `done`, all after are `pending`.
   * `STEPS.length` → every step is `done` (terminal flash before redirect).
   */
  currentStepIndex: number;
}

export function PipelineStepper({ currentStepIndex }: PipelineStepperProps) {
  return (
    <div
      data-testid="pipeline-stepper"
      className="flex flex-col gap-3.5 rounded-[20px] border border-[var(--color-border)] bg-white p-5 md:p-6"
    >
      <header className="flex flex-col gap-0.5">
        <h2 className="text-[16px] font-bold text-[var(--color-text)]">Pipeline en curso</h2>
        <p className="text-[12px] text-[var(--color-text-muted)]">8–15s estimado</p>
      </header>

      <ol className="flex flex-col gap-3">
        {STEPS.map((step, idx) => (
          <StepCard key={step.id} step={step} status={statusFor(idx, currentStepIndex)} />
        ))}
      </ol>
    </div>
  );
}

function statusFor(stepIdx: number, currentIdx: number): PipelineStepStatus {
  if (currentIdx >= STEPS.length) return 'done';
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

interface StepCardProps {
  step: PipelineStep;
  status: PipelineStepStatus;
}

function StepCard({ step, status }: StepCardProps) {
  return (
    <li
      data-testid={`pipeline-step-${step.id}`}
      data-status={status}
      className={[
        'flex items-center gap-3 rounded-[14px] p-3.5 transition-colors',
        status === 'done' && 'bg-[#d1fae5]',
        status === 'active' && 'border-2 border-[#22c55e] bg-white',
        status === 'pending' && 'border border-[var(--color-border)] bg-white',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <StepIconBubble status={status} icon={step.icon} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          className={[
            'truncate text-[13px] font-bold',
            status === 'pending' ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text)]',
          ].join(' ')}
        >
          {step.title}
        </p>
        {status === 'done' && <p className="text-[10px] text-[var(--color-text-muted)]">Listo</p>}
        {status === 'active' && step.subtitle && (
          <p className="text-[10px] font-medium text-[var(--color-primary-strong)]">
            {step.subtitle}
          </p>
        )}
      </div>
    </li>
  );
}

function StepIconBubble({
  status,
  icon,
}: {
  status: PipelineStepStatus;
  icon: PipelineStep['icon'];
}) {
  if (status === 'done') {
    return (
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#10b981] text-white">
        <CheckIcon />
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <SpinnerArc />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-muted)]">
      <PendingIcon kind={icon} />
    </span>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function SpinnerArc(): ReactNode {
  // 270° arc, animate-spin. Matches Pencil `dlSt3i` (ellipse startAngle 90, sweepAngle 270).
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
      <path
        d="M21 12a9 9 0 1 1-3-6.7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function PendingIcon({ kind }: { kind: PipelineStep['icon'] }) {
  const common = {
    'aria-hidden': true,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'h-4 w-4',
  } as const;
  if (kind === 'shield') {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  if (kind === 'sparkles') {
    return (
      <svg {...common}>
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
        <path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
        <path d="M5 17l.5 1.5 1.5.5-1.5.5L5 21l-.5-1.5L3 19l1.5-.5z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
