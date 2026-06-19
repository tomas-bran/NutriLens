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
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { SuggestionRow } from '@/components/chat/SuggestionRow';
import { CHAT_SUGGESTIONS } from '@/components/chat/types';

interface ChatHeroProps {
  onPick: (text: string) => void;
}

export function ChatHero({ onPick }: ChatHeroProps) {
  const [suggestions, setSuggestions] = useState<readonly string[]>(CHAT_SUGGESTIONS);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  // Genera (o regenera) las sugerencias contra el catálogo. El botón "Generar
  // otras" la vuelve a llamar; el endpoint baraja la muestra → resultados nuevos.
  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/suggestions', { cache: 'no-store' });
      if (!res.ok) return;
      const data: { suggestions?: string[] | null } = await res.json();
      if (mounted.current && Array.isArray(data.suggestions) && data.suggestions.length >= 2) {
        setSuggestions(data.suggestions);
      }
    } catch {
      // Fail-open: quedan las que haya (estáticas o las previas).
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadSuggestions();
    return () => {
      mounted.current = false;
    };
  }, [loadSuggestions]);

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
        <div className="flex items-center justify-between px-1">
          <p
            aria-hidden="true"
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]"
          >
            Sugerencias
          </p>
          <button
            type="button"
            onClick={loadSuggestions}
            disabled={loading}
            data-testid="chat-regenerate-suggestions"
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 disabled:opacity-50"
          >
            <Icon
              name="sparkles"
              className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
              aria-hidden="true"
            />
            {loading ? 'Generando…' : 'Generar otras'}
          </button>
        </div>
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
