'use client';

/**
 * <ChatHero> — empty state inicial del chat (Pencil M11 `B6Bjce` + `bGlGb`).
 *
 * Muestra un encabezado motivacional + sugerencias clickeables en 2 columnas
 * (spec §9.5). Las sugerencias arrancan estáticas (`CHAT_SUGGESTIONS`) y, al
 * montar, se reemplazan por unas autogeneradas por IA según el catálogo
 * (`GET /api/chat/suggestions`, NL-503). Si la generación falla, quedan las
 * estáticas — nunca se rompe el empty state.
 */
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SuggestionRow } from '@/components/chat/SuggestionRow';
import { CHAT_SUGGESTIONS } from '@/components/chat/types';

interface ChatHeroProps {
  onPick: (text: string) => void;
}

export function ChatHero({ onPick }: ChatHeroProps) {
  const [suggestions, setSuggestions] = useState<readonly string[]>(CHAT_SUGGESTIONS);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/chat/suggestions');
        if (!res.ok) return;
        const data: { suggestions?: string[] | null } = await res.json();
        if (active && Array.isArray(data.suggestions) && data.suggestions.length >= 2) {
          setSuggestions(data.suggestions);
        }
      } catch {
        // Fail-open: quedan las estáticas.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
        <ul
          className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
          aria-label="Sugerencias de preguntas"
        >
          {suggestions.map((s) => (
            <li key={s}>
              <SuggestionRow text={s} onPick={onPick} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
