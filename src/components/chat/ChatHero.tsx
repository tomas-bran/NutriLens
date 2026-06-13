'use client';

/**
 * <ChatHero> — empty state inicial del chat (rediseño, ref. diseño Claude).
 *
 * Badge de destello + encabezado, sugerencias en grilla (2 col en desktop, lista
 * en mobile) y un botón "Más sugerencias" (lupa) que regenera el set con IA según
 * las preferencias del usuario + el catálogo (`/api/chat/suggestions`). Mientras
 * carga, la lupa se anima y las cards muestran skeletons. Fail-open: si la IA
 * falla, conservamos las sugerencias que había.
 */
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SuggestionRow } from '@/components/chat/SuggestionRow';
import { CHAT_SUGGESTIONS } from '@/components/chat/types';
import { fetchSuggestions } from '@/lib/chat/fetch-suggestions';

interface ChatHeroProps {
  onPick: (text: string) => void;
  /** Productos en la base, para el subtítulo ("solo los N productos…"). */
  productsInBase?: number;
}

export function ChatHero({ onPick, productsInBase = 0 }: ChatHeroProps) {
  const [suggestions, setSuggestions] = useState<readonly string[]>(CHAT_SUGGESTIONS);
  const [loading, setLoading] = useState(false);

  const regenerate = async () => {
    setLoading(true);
    try {
      const next = await fetchSuggestions();
      if (next.length >= 2) setSuggestions(next);
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    productsInBase > 0
      ? `Respondo usando solo los ${productsInBase} productos que ya analizaste. Nunca invento.`
      : 'Respondo usando solo los productos que analices. Nunca invento.';

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 py-4"
      data-testid="chat-hero"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon name="sparkles" className="h-7 w-7" strokeWidth={0} fill="currentColor" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-xl font-extrabold tracking-tight text-[var(--color-text)] md:text-2xl">
          Preguntame sobre tus productos
        </h2>
        <p className="max-w-md text-sm text-[var(--color-text-muted)] md:text-[15px]">{subtitle}</p>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <p
            aria-hidden="true"
            className="text-[10px] font-bold uppercase tracking-[1.5px] text-[var(--color-text-muted)]"
          >
            Sugerencias
          </p>
          <button
            type="button"
            onClick={regenerate}
            disabled={loading}
            data-testid="chat-more-suggestions"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-70"
          >
            <Icon
              name="search-sparkle"
              className={`h-4 w-4 ${loading ? 'nl-lupa-loading text-[var(--color-primary)]' : ''}`}
            />
            {loading ? 'Buscando…' : 'Más sugerencias'}
          </button>
        </div>

        {loading ? (
          <ul className="grid w-full grid-cols-1 gap-2.5 md:grid-cols-2" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="h-[52px] animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
              />
            ))}
          </ul>
        ) : (
          <ul
            className="grid w-full grid-cols-1 gap-2.5 md:grid-cols-2"
            aria-label="Sugerencias de preguntas"
          >
            {suggestions.map((s) => (
              <li key={s}>
                <SuggestionRow text={s} onPick={onPick} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
