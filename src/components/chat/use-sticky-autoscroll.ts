'use client';

/**
 * `useStickyAutoscroll` (NL-305) — mantiene el scroll del contenedor pegado al
 * fondo mientras llega contenido (streaming), PERO sin robar el scroll: si el
 * usuario subió manualmente, deja de auto-scrollear hasta que vuelve al fondo.
 *
 * `signal` es cualquier valor que cambie cuando hay contenido nuevo (longitud
 * acumulada del texto, contador de deltas, etc.). Scroll instantáneo (no
 * smooth) para no quedar atrás con deltas rápidos.
 */
import { useEffect, useRef, type RefObject } from 'react';

const STICK_THRESHOLD_PX = 80;

export function useStickyAutoscroll(
  ref: RefObject<HTMLElement | null>,
  signal: number | string,
): void {
  const stick = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stick.current = distanceFromBottom < STICK_THRESHOLD_PX;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !stick.current) return;
    el.scrollTop = el.scrollHeight;
  }, [ref, signal]);
}
