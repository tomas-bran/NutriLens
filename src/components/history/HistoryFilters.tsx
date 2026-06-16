'use client';

/**
 * <HistoryFilters> — toolbar de filtros del historial (US-24, spec E04 §6.4).
 *
 * Client Component porque maneja inputs interactivos. Cada cambio dispara
 * `router.push(buildHistoryUrl(nextFilters))` con `scroll: false` para que
 * back/forward del navegador funcione naturalmente. Page se resetea a 1 en
 * cualquier cambio (lo hace `setFilter` por nosotros).
 *
 * Responsive (NL-502 / diseño W13 "Filtrar historial"):
 *   - Desktop (`≥md`): los selects van inline, en una fila bajo el buscador.
 *   - Mobile (`<md`): los selects se esconden detrás de un botón "Filtros" que
 *     abre un BOTTOMSHEET (panel que sube desde abajo). Los selects se
 *     renderean UNA sola vez (mismo `data-testid`): el contenedor cambia de
 *     toolbar inline a panel-sheet según el breakpoint y el estado `open`.
 *
 * Búsqueda: el input mantiene un estado local `qDraft` que se sincroniza
 * con la URL **300 ms después** del último keystroke (debounce). Si el
 * usuario aprieta Enter o submitea el form, el push es inmediato.
 *
 * Selects: usan `<FilterSelect>` custom basado en `@radix-ui/react-select`
 * (accesible, sin dropdown nativo del SO, look consistente con los tokens
 * de NutriLens).
 */
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { cn } from '@/lib/cn';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  buildHistoryUrl,
  setFilter,
  type HistoryFilters as HistoryFiltersValue,
} from '@/lib/products/history-filters';
import {
  ALERGENOS,
  CATEGORIAS,
  type Alergeno,
  type Categoria,
  type Riesgo,
} from '@schemas/product';
import { type Apto } from '@/lib/products/query-schema';

const SEARCH_DEBOUNCE_MS = 300;

export interface HistoryFiltersProps {
  /** Current filter state, derived from the URL on the server. */
  value: HistoryFiltersValue;
}

const APTO_OPTIONS: ReadonlyArray<{ value: Apto; label: string }> = [
  { value: 'vegano', label: 'Apto vegano' },
  { value: 'celiaco', label: 'Apto celíaco' },
  { value: 'sin_lactosa', label: 'Sin lactosa' },
];

const RIESGO_OPTIONS: ReadonlyArray<{ value: Riesgo; label: string }> = [
  { value: 'bajo', label: 'Bajo' },
  { value: 'medio', label: 'Medio' },
  { value: 'alto', label: 'Alto' },
];

export function HistoryFilters({ value }: HistoryFiltersProps) {
  const router = useRouter();
  // Estado local del input: re-renderea instantáneo en cada tecla.
  const [qDraft, setQDraft] = useState(value.q ?? '');
  // Estado del bottomsheet de filtros (solo relevante en mobile).
  const [sheetOpen, setSheetOpen] = useState(false);
  // El valor debounced (300ms) es el que dispara el push a URL. Esto evita
  // un push por tecla — solo un push después que el usuario hace una pausa.
  const debouncedQ = useDebouncedValue(qDraft, SEARCH_DEBOUNCE_MS);

  // Si la URL cambia externamente (back/forward, click en chip), resync el input.
  useEffect(() => {
    setQDraft(value.q ?? '');
  }, [value.q]);

  // Mientras el sheet está abierto: cerrar con Escape + bloquear scroll del body.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [sheetOpen]);

  // Track del último `q` que pusheamos para no re-pushear el mismo valor.
  const lastPushedQRef = useRef<string>(value.q ?? '');
  useEffect(() => {
    lastPushedQRef.current = value.q ?? '';
  }, [value.q]);
  useEffect(() => {
    const normalized = debouncedQ.trim();
    const current = (value.q ?? '').trim();
    if (normalized === current) return;
    if (normalized === lastPushedQRef.current.trim()) return;
    lastPushedQRef.current = normalized;
    router.push(buildHistoryUrl(setFilter(value, 'q', normalized || undefined)), {
      scroll: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  function go(next: HistoryFiltersValue) {
    router.push(buildHistoryUrl(next), { scroll: false });
  }

  function onSelectCategoria(next: string) {
    const v = (next || undefined) as Categoria | undefined;
    go(setFilter(value, 'categoria', v));
  }
  function onSelectRiesgo(next: string) {
    const v = (next || undefined) as Riesgo | undefined;
    go(setFilter(value, 'riesgo', v));
  }
  function onSelectAlergeno(next: string) {
    const v = (next || undefined) as Alergeno | undefined;
    go(setFilter(value, 'alergeno', v));
  }
  function onSelectApto(next: string) {
    const v = (next || undefined) as Apto | undefined;
    go(setFilter(value, 'apto', v));
  }
  function onSubmitSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    go(setFilter(value, 'q', qDraft.trim() || undefined));
  }

  const activeCount = [value.categoria, value.riesgo, value.alergeno, value.apto].filter(
    Boolean,
  ).length;

  return (
    <section
      aria-labelledby="history-filters-title"
      data-testid="history-filters"
      className="flex flex-col gap-3"
    >
      <h2 id="history-filters-title" className="sr-only">
        Filtros del catálogo
      </h2>

      <div className="flex items-center gap-2">
        <form
          role="search"
          action="/historial"
          method="get"
          onSubmit={onSubmitSearch}
          className="flex flex-1 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2"
        >
          <Icon name="scan-line" className="h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            name="q"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Buscar producto…"
            aria-label="Buscar producto"
            data-testid="history-search-input"
            className="flex-1 bg-transparent text-[14px] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
          {/* Preserve the rest of the filters as hidden inputs so submitting
              the form without JS reaches the same URL shape. */}
          {value.categoria && <input type="hidden" name="categoria" value={value.categoria} />}
          {value.riesgo && <input type="hidden" name="riesgo" value={value.riesgo} />}
          {value.alergeno && <input type="hidden" name="alergeno" value={value.alergeno} />}
          {value.apto && <input type="hidden" name="apto" value={value.apto} />}
        </form>

        {/* Disparador del bottomsheet — solo mobile. */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          data-testid="history-filter-open"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          className="relative inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-[13px] font-medium text-[var(--color-text)] md:hidden"
        >
          <Icon name="filter" className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <span
              data-testid="history-filter-count"
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold text-white"
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Backdrop del sheet — solo mobile, solo cuando está abierto. */}
      {sheetOpen && (
        <button
          type="button"
          aria-label="Cerrar filtros"
          onClick={() => setSheetOpen(false)}
          data-testid="history-filter-backdrop"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {/* Contenedor de los selects. Una sola instancia:
            - mobile cerrado  → `hidden`
            - mobile abierto  → panel bottomsheet (fixed bottom)
            - desktop (`md`)  → toolbar inline (las clases `md:` ganan) */}
      <div
        data-testid="history-filter-toolbar"
        aria-label="Filtros"
        className={cn(
          sheetOpen
            ? 'fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.15)]'
            : 'hidden',
          'md:static md:z-auto md:flex md:max-h-none md:flex-row md:flex-wrap md:gap-2 md:overflow-visible md:rounded-none md:bg-transparent md:p-0 md:pb-0 md:shadow-none',
        )}
      >
        {/* Cabecera del sheet (handle + título + cerrar) — solo mobile. */}
        <div className="flex flex-col gap-3 md:hidden">
          <span
            className="mx-auto h-1 w-10 rounded-full bg-[var(--color-border)]"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--color-text)]">Filtrar catálogo</h3>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              data-testid="history-filter-close"
              aria-label="Cerrar"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <FilterSelect
          label="Categoría"
          value={value.categoria ?? ''}
          onValueChange={onSelectCategoria}
          testId="history-filter-categoria"
          options={CATEGORIAS.map((c) => ({ value: c, label: c }))}
        />
        <FilterSelect
          label="Riesgo"
          value={value.riesgo ?? ''}
          onValueChange={onSelectRiesgo}
          testId="history-filter-riesgo"
          options={RIESGO_OPTIONS}
        />
        <FilterSelect
          label="Alérgeno"
          value={value.alergeno ?? ''}
          onValueChange={onSelectAlergeno}
          testId="history-filter-alergeno"
          options={ALERGENOS.map((a) => ({ value: a, label: a }))}
        />
        <FilterSelect
          label="Aptitud"
          value={value.apto ?? ''}
          onValueChange={onSelectApto}
          testId="history-filter-apto"
          options={APTO_OPTIONS}
        />
      </div>
    </section>
  );
}
