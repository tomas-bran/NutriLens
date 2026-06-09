/**
 * <PipelineTrace> — panel colapsable con el detalle paso-a-paso del análisis.
 *
 * Lee `pipelineTrace` del producto persistido y renderiza cada step con
 * status (ok / skipped / error), duración y un total al pie.
 *
 * Spec: `docs/specs/E06-pipeline-observable-y-ux.md §3` (US-33).
 *
 * Decisiones:
 *  - **Colapsable**: cerrado por default en mobile, abierto en desktop. Estado
 *    inicial se decide leyendo `window.matchMedia('(min-width: 768px)')` en un
 *    `useState` con lazy initializer (server-safe).
 *  - **Naming amigable**: `STEP_LABELS` traduce `validate_file → "Validar archivo"`,
 *    `extract_with_ia → "Extracción con IA"`, etc. Si llega un step name fuera
 *    del enum lo mostramos con el name técnico — es defensivo por si el back
 *    agrega un step nuevo antes que el front.
 *  - **Trace inválido**: si `pipelineTrace` no parsea o no es array, ocultamos
 *    el panel entero (no rompemos la página). El back garantiza el shape, pero
 *    no queremos blanquear la pantalla si hay un row corrupto del histórico.
 *  - **Total**: suma de `durationMs`. No usamos timestamps porque steps pueden
 *    correr en paralelo (no ahora pero podría ser); la suma de duraciones es
 *    el cost-time que queremos mostrar al usuario.
 */
'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StepTraceSchema, type StepName, type StepStatus } from '@schemas/pipeline';
import { z } from 'zod';

export const STEP_LABELS: Record<StepName, string> = {
  validate_file: 'Validar archivo',
  detect_label_kind: 'Detectar etiqueta',
  extract_with_ia: 'Extracción con IA',
  validate_schema: 'Validar JSON',
  enrich_with_off: 'Verificar con OFF',
  apply_rules: 'Aplicar reglas',
  compute_risk: 'Calcular riesgo',
  generate_explanation: 'Generar explicación',
  persist: 'Persistir',
};

const PipelineTraceSchema = z.array(StepTraceSchema);

interface PipelineTraceProps {
  /**
   * El campo `pipelineTrace` del producto persistido. Puede venir como string
   * JSON o como array ya parseado (depende del caller).
   */
  trace: unknown;
  /** Override del default colapsable — útil en tests. */
  defaultOpen?: boolean;
}

export function PipelineTrace({ trace, defaultOpen }: PipelineTraceProps) {
  const parsed = PipelineTraceSchema.safeParse(trace);
  // Trace inválido o vacío → no renderizamos nada. La pantalla sigue funcionando.
  if (!parsed.success || parsed.data.length === 0) return null;
  const steps = parsed.data;

  return <PipelineTraceContent steps={steps} defaultOpen={defaultOpen} />;
}

function PipelineTraceContent({
  steps,
  defaultOpen,
}: {
  steps: ReadonlyArray<z.infer<typeof StepTraceSchema>>;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    if (defaultOpen !== undefined) return defaultOpen;
    // SSR: si window no existe asumimos desktop (abierto). En cliente el primer
    // render usa el media query real.
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 768px)').matches;
  });

  const totalMs = steps.reduce((acc, s) => acc + s.durationMs, 0);

  return (
    <section
      data-testid="pipeline-trace"
      aria-labelledby="pipeline-trace-title"
      className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-5"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="pipeline-trace-toggle"
        aria-expanded={open}
        aria-controls="pipeline-trace-body"
        className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
      >
        <h2
          id="pipeline-trace-title"
          className="text-sm font-bold text-[var(--color-text)] md:text-base"
        >
          Pipeline del análisis
        </h2>
        <Icon
          name="arrow-right"
          aria-hidden="true"
          className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform ${
            open ? 'rotate-90' : ''
          }`}
        />
      </button>

      {open && (
        <div id="pipeline-trace-body" className="flex flex-col gap-1.5">
          <ol className="flex flex-col gap-1.5">
            {steps.map((step, idx) => (
              <StepRow key={`${step.name}-${idx}`} step={step} />
            ))}
          </ol>
          <div className="mt-1 flex items-center justify-between border-t border-[var(--color-border)] pt-2 text-xs font-semibold text-[var(--color-text)] md:text-sm">
            <span>Total</span>
            <span data-testid="pipeline-trace-total">{formatMs(totalMs)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function StepRow({ step }: { step: z.infer<typeof StepTraceSchema> }) {
  const label = STEP_LABELS[step.name as StepName] ?? step.name;
  return (
    <li
      data-testid={`pipeline-step-${step.name}`}
      data-status={step.status}
      className="flex flex-col gap-1"
    >
      <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <StatusIcon status={step.status} />
          <span className="truncate text-[var(--color-text)]">{label}</span>
        </span>
        <span className="flex flex-shrink-0 items-center gap-3 text-[var(--color-text-muted)]">
          <span className="hidden md:inline">{step.status}</span>
          <span className="tabular-nums">{formatMs(step.durationMs)}</span>
        </span>
      </div>
      {step.status === 'error' && <ErrorDetails details={step.details} />}
    </li>
  );
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === 'ok') {
    return (
      <span
        aria-label="ok"
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-strong)]"
      >
        <Icon name="check" strokeWidth={3} className="h-3 w-3" aria-hidden="true" />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        aria-label="error"
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-risk-high-bg)] text-[var(--color-risk-high)]"
      >
        <Icon name="close" strokeWidth={3} className="h-3 w-3" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      aria-label="skipped"
      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)]"
    >
      <span aria-hidden="true" className="text-xs font-bold leading-none">
        –
      </span>
    </span>
  );
}

function ErrorDetails({ details }: { details?: Record<string, unknown> }) {
  // Tomamos `error` o `reason` (lo que el step haya guardado). Si no hay nada,
  // mostramos un placeholder genérico para que el panel comunique el fallo.
  const msg =
    (typeof details?.error === 'string' && details.error) ||
    (typeof details?.reason === 'string' && details.reason) ||
    'Falló este paso.';
  return (
    <p
      className="ml-7 text-[11px] text-[var(--color-risk-high)] md:text-xs"
      data-testid="pipeline-step-error-msg"
    >
      {msg}
    </p>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
