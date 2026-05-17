/**
 * Banner shown above the risk block when the model returned `confidence < 0.6`.
 * Spec: E03 §6.3 + US-20.
 */
import { Icon } from '@/components/ui/Icon';

export function LowConfidenceBanner() {
  return (
    <section
      role="status"
      aria-live="polite"
      data-testid="low-confidence-banner"
      className="flex items-center gap-3 rounded-[14px] border border-[var(--color-warning-bg)] bg-[var(--color-warning-bg)] p-4"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-warning)]">
        <Icon name="triangle-alert" className="h-[18px] w-[18px]" />
      </span>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[14px] font-bold text-[var(--color-text)]">Confianza baja</h2>
        <p className="text-[12px] text-[var(--color-text-muted)]">
          El análisis puede tener errores. Probá con una foto más nítida.
        </p>
      </div>
    </section>
  );
}
