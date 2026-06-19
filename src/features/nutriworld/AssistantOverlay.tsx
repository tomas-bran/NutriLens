'use client';

/**
 * Overlay 2D sobre la escena: mensaje + estado del NPC arriba, e input de
 * consulta con ejemplos abajo. `pointer-events-auto` solo en los controles para
 * que el resto de los clicks lleguen al canvas 3D.
 */
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { setMuted, submitQuery, useNutriWorld, type NpcState } from './store/useNutriWorldStore';

/** Pills de arranque (cuando todavía no se preguntó nada). */
const STARTER_PILLS = [
  'Mostrame galletitas aptas para celíacos',
  'Quiero algo sin lactosa',
  'Buscá snacks de riesgo bajo',
  'Mostrame productos veganos',
];

/**
 * Pills dinámicas según lo último que se habló: sugiere filtros que NO estaban
 * en la última consulta para que la conversación avance (en vez de repetir).
 * Determinístico (sin LLM) → estable para la demo.
 */
function dynamicPills(lastQuery: string | null, npcState: NpcState): string[] {
  if (!lastQuery || npcState === 'idle') return STARTER_PILLS;
  const q = lastQuery.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const candidates: Array<{ when: boolean; pill: string }> = [
    { when: !q.includes('vegan'), pill: 'Mostrame productos veganos' },
    { when: !q.includes('lactosa'), pill: 'Quiero algo sin lactosa' },
    {
      when: !q.includes('celiac') && !q.includes('gluten'),
      pill: 'Mostrame aptos para celíacos',
    },
    { when: !q.includes('snack'), pill: 'Buscá snacks de riesgo bajo' },
    { when: !q.includes('riesgo'), pill: 'Mostrame algo de riesgo bajo' },
    { when: !q.includes('cereal'), pill: 'Mostrame cereales' },
  ];
  const picked = candidates.filter((c) => c.when).map((c) => c.pill);
  return (picked.length > 0 ? picked : STARTER_PILLS).slice(0, 4);
}

const STATE_TEXT: Record<NpcState, string> = {
  idle: 'Listo para ayudarte',
  thinking: 'Pensando…',
  guiding: 'Te estoy guiando',
  arrived: 'Llegamos a la góndola',
};

const WELCOME = '¡Hola! Soy NutriLens. Preguntame qué buscás y te llevo a la góndola.';

export function AssistantOverlay() {
  const [text, setText] = useState('');
  const message = useNutriWorld((s) => s.assistantMessage);
  const npcState = useNutriWorld((s) => s.npcState);
  const loading = useNutriWorld((s) => s.loading);
  const source = useNutriWorld((s) => s.source);
  const muted = useNutriWorld((s) => s.muted);
  const speaking = useNutriWorld((s) => s.speaking);
  const lastQuery = useNutriWorld((s) => s.query);
  const pills = useMemo(() => dynamicPills(lastQuery, npcState), [lastQuery, npcState]);

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
      {/* Panel del asistente (arriba, centrado). Siempre visible: saluda al
          entrar y se actualiza con cada respuesta. */}
      <div className="pointer-events-none absolute left-1/2 top-4 w-[min(92vw,560px)] -translate-x-1/2">
        <div className="pointer-events-auto rounded-2xl border border-[var(--color-border)] bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Icon name="sparkles" className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-[var(--color-text)]">NutriLens</span>
            <span className="text-xs text-[var(--color-text-muted)]">
              · {speaking && !muted ? 'Hablando…' : STATE_TEXT[npcState]}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {source === 'ai' && !loading && (
                <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
                  IA
                </span>
              )}
              <button
                type="button"
                onClick={() => setMuted(!muted)}
                aria-label={muted ? 'Activar voz de NutriLens' : 'Silenciar voz de NutriLens'}
                title={muted ? 'Activar voz' : 'Silenciar'}
                data-testid="nutriworld-mute"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
              >
                <Icon
                  name={muted ? 'volume-off' : 'volume'}
                  className={cn(
                    'h-4 w-4',
                    speaking && !muted && 'animate-pulse text-[var(--color-primary)]',
                  )}
                />
              </button>
            </div>
          </div>
          <p className="text-[13.5px] leading-relaxed text-[var(--color-text)]">
            {loading ? 'Déjame buscar en las góndolas…' : (message ?? WELCOME)}
          </p>
        </div>
      </div>

      {/* Input + ejemplos (abajo). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4">
        <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
          {pills.map((ex) => (
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
