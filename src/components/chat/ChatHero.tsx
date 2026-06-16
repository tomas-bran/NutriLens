/**
 * <ChatHero> — empty state inicial del chat (Pencil M11 `B6Bjce` + `bGlGb`).
 *
 * Muestra un encabezado motivacional + 3-4 sugerencias clickeables (spec §9.5).
 * Las sugerencias salen de `CHAT_SUGGESTIONS` para que sean una sola fuente
 * de verdad entre UI y tests.
 */
import { Icon } from '@/components/ui/Icon';
import { SuggestionRow } from '@/components/chat/SuggestionRow';
import { CHAT_SUGGESTIONS } from '@/components/chat/types';

interface ChatHeroProps {
  onPick: (text: string) => void;
}

export function ChatHero({ onPick }: ChatHeroProps) {
  return (
    <div className="flex w-full flex-col items-center gap-6 py-4" data-testid="chat-hero">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon name="sparkles" className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-bold text-[var(--color-text)] md:text-xl">
          Preguntame sobre el catálogo
        </h2>
        <p className="max-w-md text-sm text-[var(--color-text-muted)] md:text-base">
          Respondo usando los productos del catálogo.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <p
          aria-hidden="true"
          className="px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]"
        >
          Sugerencias
        </p>
        <ul className="flex w-full flex-col gap-2" aria-label="Sugerencias de preguntas">
          {CHAT_SUGGESTIONS.map((s) => (
            <li key={s}>
              <SuggestionRow text={s} onPick={onPick} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
