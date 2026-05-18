/**
 * <SuggestionRow> — fila clickeable del hero del chat con un ejemplo de
 * pregunta. Pencil ref: hijos de `bGlGb` (M11 idle). Al clickear, el page
 * dispara `onPick(text)` que arma el flujo normal de envío.
 */
import { Icon } from '@/components/ui/Icon';

interface SuggestionRowProps {
  text: string;
  onPick: (text: string) => void;
}

export function SuggestionRow({ text, onPick }: SuggestionRowProps) {
  return (
    <button
      type="button"
      data-testid="chat-suggestion"
      onClick={() => onPick(text)}
      className="flex w-full items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-left text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
    >
      <span
        aria-hidden="true"
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-primary)]"
      >
        <Icon name="sparkles" className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate">{text}</span>
      <Icon
        name="arrow-right"
        className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]"
        aria-hidden="true"
      />
    </button>
  );
}
