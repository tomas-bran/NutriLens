'use client';

/**
 * Overlay 2D sobre la escena: mensaje + estado del NPC arriba, e input de
 * consulta con ejemplos abajo. `pointer-events-auto` solo en los controles para
 * que el resto de los clicks lleguen al canvas 3D.
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { submitQuery, useNutriWorld, type NpcState } from './store/useNutriWorldStore';

const EXAMPLES = [
  'Mostrame galletitas aptas para celíacos',
  'Quiero algo sin lactosa',
  'Buscá snacks de riesgo bajo',
  'Mostrame productos veganos',
];

const STATE_TEXT: Record<NpcState, string> = {
  idle: 'Listo para ayudarte',
  thinking: 'Pensando…',
  guiding: 'Te estoy guiando',
  arrived: 'Llegamos a la góndola',
};

export function AssistantOverlay() {
  const [text, setText] = useState('');
  const message = useNutriWorld((s) => s.assistantMessage);
  const npcState = useNutriWorld((s) => s.npcState);
  const loading = useNutriWorld((s) => s.loading);
  const source = useNutriWorld((s) => s.source);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submitQuery(text);
  };
  const ask = (q: string) => {
    setText(q);
    void submitQuery(q);
  };

  return (
    <>
      {/* Mensaje del asistente (arriba, centrado). */}
      {(message || loading) && (
        <div className="pointer-events-none absolute left-1/2 top-4 w-[min(92vw,560px)] -translate-x-1/2">
          <div className="pointer-events-auto rounded-2xl border border-[var(--color-border)] bg-white/95 p-4 shadow-lg backdrop-blur">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <Icon name="sparkles" className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-[var(--color-text)]">NutriLens</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                · {STATE_TEXT[npcState]}
              </span>
              {source === 'ai' && !loading && (
                <span className="ml-auto rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
                  IA
                </span>
              )}
            </div>
            <p className="text-[13.5px] leading-relaxed text-[var(--color-text)]">
              {loading ? 'Déjame buscar en las góndolas…' : message}
            </p>
          </div>
        </div>
      )}

      {/* Input + ejemplos (abajo). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4">
        <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => ask(ex)}
              disabled={loading}
              className="rounded-full border border-[var(--color-border)] bg-white/90 px-3 py-1.5 text-xs font-medium text-[var(--color-text)] shadow-sm backdrop-blur transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
        <form
          onSubmit={onSubmit}
          className="pointer-events-auto flex w-[min(92vw,560px)] items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 shadow-lg"
        >
          <Icon name="chat" className="h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Preguntale a NutriLens qué buscás…"
            aria-label="Consulta para NutriLens"
            data-testid="nutriworld-query-input"
            className="flex-1 bg-transparent text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !text.trim()}
            data-testid="nutriworld-ask"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-colors',
              loading || !text.trim()
                ? 'cursor-not-allowed bg-[var(--color-text-muted)]'
                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-strong)]',
            )}
          >
            {loading ? '…' : 'Preguntar'}
          </button>
        </form>
      </div>
    </>
  );
}
