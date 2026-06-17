'use client';

/**
 * Hook de teclado para el movimiento del jugador. Mantiene en un ref el set de
 * acciones presionadas (forward/back/left/right/run) para que `useFrame` lo lea
 * sin re-renders. El `onInteract` se dispara al apretar `E`.
 */
import { useEffect, useRef } from 'react';

export type MoveAction = 'forward' | 'back' | 'left' | 'right' | 'run';

const KEY_MAP: Record<string, MoveAction> = {
  arrowup: 'forward',
  w: 'forward',
  arrowdown: 'back',
  s: 'back',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right',
  shift: 'run',
};

/** ¿El foco está en un campo de texto? Entonces el teclado es para escribir,
 * no para mover al personaje (si no, tipear "WASD" en el input lo movía). */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  const tag = el.tagName.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function useKeyboard(onInteract?: () => void): React.RefObject<Set<MoveAction>> {
  const keys = useRef<Set<MoveAction>>(new Set());
  const interactRef = useRef(onInteract);
  interactRef.current = onInteract;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Mientras se escribe en un input/textarea, ignoramos el teclado de juego.
      if (isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'e') {
        interactRef.current?.();
        return;
      }
      const action = KEY_MAP[key];
      if (action) keys.current.add(action);
    };
    const up = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.key.toLowerCase()];
      if (action) keys.current.delete(action);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return keys;
}
