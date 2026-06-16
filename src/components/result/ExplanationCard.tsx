/**
 * Highlighted card with the model-generated explanation. Pencil ref:
 * `mAZg5` rsHero variant — green-soft tinted card with sparkles icon.
 */
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

export function ExplanationCard({ explanation }: { explanation: string | null }) {
  if (!explanation) return null;
  return (
    <Card
      padding="md"
      className="relative flex items-start gap-3 overflow-hidden border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]"
      data-testid="explanation-card"
    >
      {/* Barra izquierda con degradé primary→lime (Claude Design). */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: 'linear-gradient(var(--color-primary), var(--color-accent-lime))' }}
      />
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-primary)]">
        <Icon name="sparkles" className="h-[18px] w-[18px]" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-[14px] font-bold text-[var(--color-primary-strong)]">
          En palabras simples
        </h2>
        <p className="text-[13px] leading-relaxed text-[var(--color-text)]">{explanation}</p>
      </div>
    </Card>
  );
}
