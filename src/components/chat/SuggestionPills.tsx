'use client';

/**
 * <SuggestionPills> — fila horizontal scrollable de pills de preguntas sugeridas.
 * Aparece durante la conversación (una vez que hay mensajes) para guiar al usuario.
 * NL-503.
 *
 * Las pills vienen del backend (`suggestions` del response del chat, generadas
 * por el LLM según el contexto de la conversación); si la generación falló o
 * todavía no hubo respuesta, caemos al set estático `CHAT_SUGGESTIONS`.
 */
import { CHAT_SUGGESTIONS } from '@/components/chat/types';
import { cn } from '@/lib/cn';

interface SuggestionPillsProps {
  onPick: (text: string) => void;
  /** Sugerencias contextuales del último response; null/undefined => set estático. */
  suggestions?: readonly string[] | null;
  /** Pregunta que el usuario ya envió; se excluye de las pills. */
  lastQuestion?: string | null;
  className?: string;
}

export function SuggestionPills({
  onPick,
  suggestions,
  lastQuestion,
  className,
}: SuggestionPillsProps) {
  const source = suggestions && suggestions.length > 0 ? suggestions : CHAT_SUGGESTIONS;
  const pills = source.filter((s) => s.toLowerCase() !== (lastQuestion ?? '').toLowerCase());

  if (pills.length === 0) return null;

  return (
    <div
      data-testid="suggestion-pills"
      aria-label="Sugerencias de preguntas"
      className={cn('scrollbar-hide flex gap-2 overflow-x-auto pb-1', className)}
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
