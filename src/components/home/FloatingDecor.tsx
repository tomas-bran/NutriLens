/**
 * <FloatingDecor> (NL-504) — capa de fondo del hero: halo que respira +
 * estrellitas lima que titilan a lo largo de TODO el banner. Puramente
 * decorativo (aria-hidden); con prefers-reduced-motion queda estático
 * (`home-glow`/`nl-twinkle` se neutralizan en CSS).
 *
 * Se renderiza antes del grid de contenido, así que queda por debajo del texto
 * y los CTAs. Los chips de alérgenos viven en <DecorLens> (Hero), orbitando el
 * lente, para que su posición se ajuste sola y no colisione con el texto.
 *
 * No usa librerías de animación: solo CSS keyframes (globals.css).
 */
import { Icon } from '@/components/ui/Icon';

/** PRNG sembrado (mulberry32): scatter "random" pero estable entre renders
 * — evita hydration mismatch y layout jank. Cambiar el seed regenera el patrón. */
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Estrellitas dispersas por TODO el banner, en posiciones/tamaños/tiempos
 * pseudo-aleatorios acotados a un umbral prolijo. Random sembrado para que el
 * patrón sea estable (sin hydration mismatch ni jank entre renders).
 */
const SPARKLES = (() => {
  const rand = mulberry32(0x5eed);
  return Array.from({ length: 12 }, () => ({
    top: `${Math.round(rand() * 100)}%`,
    left: `${Math.round(rand() * 100)}%`,
    size: Math.round(10 + rand() * 12),
    delay: `${(rand() * 3).toFixed(2)}s`,
    duration: `${(2.6 + rand() * 1.8).toFixed(2)}s`,
  }));
})();

export function FloatingDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
      {/* Halo que respira detrás del lente. */}
      <div className="home-glow absolute right-[14%] top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-white/25 blur-3xl" />
      {/* Estrellitas a lo largo de todo el banner (capa de fondo, detrás del
          contenido por el orden del DOM). */}
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="nl-twinkle absolute text-[var(--color-accent-lime)]"
          style={{
            top: s.top,
            left: s.left,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        >
          <Icon
            name="sparkles"
            strokeWidth={0}
            fill="currentColor"
            style={{ width: s.size, height: s.size }}
          />
        </span>
      ))}
    </div>
  );
}
