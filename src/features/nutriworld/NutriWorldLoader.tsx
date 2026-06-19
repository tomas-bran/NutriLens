'use client';

/**
 * Controla la pantalla de carga: llena la barra 0→100 con ease-out (~1.6s,
 * enmascara el pop-in de las fuentes 3D y el primer frame del Canvas) y luego
 * hace fade-out. Determinista — no depende del tracking de assets (troika no
 * pasa por el LoadingManager de three, así que `useProgress` no lo reflejaría).
 */
import { useEffect, useRef, useState } from 'react';
import { NutriWorldLoadingScreen } from './NutriWorldLoadingScreen';
import { setWorldReady } from './store/useNutriWorldStore';

const FILL_MS = 1600;
const HOLD_MS = 250;
const FADE_MS = 500;

export function NutriWorldLoader() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'fading' | 'done'>('loading');
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const linear = Math.min(1, (t - startRef.current) / FILL_MS);
      setProgress(100 * (1 - Math.pow(1 - linear, 2))); // ease-out
      if (linear < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        timers.push(
          setTimeout(() => {
            setPhase('fading');
            // El mundo ya es visible → arranca la animación de entrada del NPC.
            setWorldReady();
          }, HOLD_MS),
        );
        timers.push(setTimeout(() => setPhase('done'), HOLD_MS + FADE_MS));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (phase === 'done') return null;

  return (
    <div
      className={`absolute inset-0 z-50 transition-opacity duration-500 ${
        phase === 'fading' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-hidden={phase === 'fading'}
    >
      <NutriWorldLoadingScreen progress={progress} />
    </div>
  );
}
