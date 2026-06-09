/**
 * `useDebouncedValue<T>(value, delayMs)` — devuelve `value` con un retardo:
 * solo se actualiza cuando pasaron `delayMs` sin nuevos cambios.
 *
 * Uso típico: input de búsqueda → el render lee el `qDraft` instantáneo, pero
 * el `useEffect` que dispara la URL usa el `useDebouncedValue(qDraft, 300)`
 * para evitar un push por cada tecla.
 *
 * Implementación trivial con `setTimeout` + cleanup. No usamos `useDeferred`
 * porque no es ajustable, ni una lib externa porque son 6 líneas reales.
 */
'use client';

import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
