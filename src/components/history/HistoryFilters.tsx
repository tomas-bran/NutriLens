'use client';

/**
 * <HistoryFilters> — toolbar de filtros del historial (US-24, spec E04 §6.4).
 *
 * Client Component porque maneja inputs interactivos. Cada cambio dispara
 * `router.push(buildHistoryUrl(nextFilters))` con `scroll: false` para que
 * back/forward del navegador funcione naturalmente. Page se resetea a 1 en
 * cualquier cambio (lo hace `setFilter` por nosotros).
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
  // El valor debounced (300ms) es el que dispara el push a URL. Esto evita
  // un push por tecla — solo un push después que el usuario hace una pausa.
  const debouncedQ = useDebouncedValue(qDraft, SEARCH_DEBOUNCE_MS);

  // Si la URL cambia externamente (back/forward, click en chip), resync el input.
  useEffect(() => {
    setQDraft(value.q ?? '');
  }, [value.q]);

  // Track del último `q` que pusheamos para no re-pushear el mismo valor:
  // - en el primer render (debouncedQ === value.q por construcción).
  // - cuando la URL cambia externamente y el useEffect anterior nos sincroniza.
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
    // Intencionalmente no incluimos `value` en deps: solo queremos dispararnos
    // cuando el usuario tipea (cambia debouncedQ). El sync URL→input lo hace
    // el useEffect de arriba.
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

  return (
    <section
      aria-labelledby="history-filters-title"
      data-testid="history-filters"
      className="flex flex-col gap-3"
    >
      <h2 id="history-filters-title" className="sr-only">
        Filtros del historial
      </h2>

      <form
        role="search"
        action="/historial"
        method="get"
        onSubmit={onSubmitSearch}
        className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2"
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

      <div
        className="flex flex-wrap gap-2"
        role="toolbar"
        aria-label="Filtros"
        data-testid="history-filter-toolbar"
      >
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
