/**
 * <ObservablePipeline> — lista estática y numerada de los pasos del análisis,
 * en la segunda columna del estado idle del analizador. Comunica que cada paso
 * es visible y auditable (Claude Design `screen-analyze.jsx`).
 */
import { PIPELINE_STEPS } from './pipeline-steps';

export function ObservablePipeline() {
  return (
    <div
      className="rounded-[20px] border border-[var(--color-border)] bg-white p-5 md:p-6"
      data-testid="observable-pipeline"
    >
      <header className="mb-4 flex flex-col gap-0.5">
        <h2 className="text-[16px] font-bold text-[var(--color-text)]">Pipeline observable</h2>
        <p className="text-[12.5px] text-[var(--color-text-muted)]">
          Cada paso del análisis es visible y auditable.
        </p>
      </header>
      <ol className="flex flex-col gap-3.5">
        {PIPELINE_STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[12px] font-bold text-[var(--color-text-muted)]">
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="text-[13.5px] font-bold text-[var(--color-text)]">{s.title}</div>
              <div className="font-mono text-[11px] text-[var(--color-text-muted)]">{s.detail}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
