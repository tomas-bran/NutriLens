'use client';

/**
 * <SuggestionPills> — fila horizontal scrollable de pills de preguntas sugeridas.
 * Aparece durante la conversación (una vez que hay mensajes) para guiar al usuario.
 * NL-503.
 */
import { CHAT_SUGGESTIONS } from '@/components/chat/types';
import { cn } from '@/lib/cn';

interface SuggestionPillsProps {
  onPick: (text: string) => void;
  /** Pregunta que el usuario ya envió; se excluye de las pills. */
  lastQuestion?: string | null;
  className?: string;
}

export function SuggestionPills({ onPick, lastQuestion, className }: SuggestionPillsProps) {
  const pills = CHAT_SUGGESTIONS.filter(
    (s) => s.toLowerCase() !== (lastQuestion ?? '').toLowerCase(),
  );

  if (pills.length === 0) return null;

  return (
    <div
      data-testid="suggestion-pills"
      aria-label="Sugerencias de preguntas"
      className={cn('flex gap-2 overflow-x-auto pb-1 scrollbar-hide', className)}
    >
      {pills.map((text) => (
        <button
          key={text}
          type="button"
          onClick={() => onPick(text)}
          className="flex-shrink-0 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
