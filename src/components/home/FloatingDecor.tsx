/**
 * <FloatingDecor> (NL-504) — chips de alérgenos/sellos que "levitan" alrededor
 * del hero + estrellitas lima que titilan a lo largo de TODO el banner.
 * Puramente decorativo (aria-hidden); con prefers-reduced-motion quedan
 * estáticos (las clases `home-float`/`home-glow`/`nl-twinkle` se neutralizan).
 *
 * Es la capa de fondo del hero: se renderiza antes del grid de contenido, así
 * que las estrellitas quedan por debajo del texto, los CTAs y el lente — nunca
 * encima del círculo blanco de la cámara.
 *
 * No usa librerías de animación: solo CSS keyframes definidos en globals.css,
 * para no sumar peso al bundle ni costo de runtime.
 */
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';

interface Chip {
  icon: IconName;
  label: string;
  /** Posición (en %) dentro del contenedor del hero. */
  top: string;
  left?: string;
  right?: string;
  /** Desfasaje y duración para que no floten todos sincronizados. */
  delay: string;
  duration: string;
  /** Escala sutil para profundidad. */
  scale?: string;
}

const CHIPS: Chip[] = [
  { icon: 'wheat-off', label: 'Sin gluten', top: '12%', right: '8%', delay: '0s', duration: '6s' },
  {
    icon: 'milk-off',
    label: 'Sin lactosa',
    top: '80%',
    right: '29%',
    delay: '1.2s',
    duration: '7s',
    scale: '0.92',
  },
  {
    icon: 'vegan',
    label: 'Vegano',
    top: '30%',
    right: '38%',
    delay: '0.6s',
    duration: '6.5s',
    scale: '0.85',
  },
  {
    icon: 'nut',
    label: 'Frutos secos',
    top: '70%',
    right: '6%',
    delay: '2s',
    duration: '7.5s',
    scale: '0.9',
  },
];

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
      {/* Halo que respira detrás de los chips. */}
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
      {CHIPS.map((chip) => (
        <div
          key={chip.label}
          className="home-float absolute"
          style={{
            top: chip.top,
            ...(chip.left ? { left: chip.left } : {}),
            ...(chip.right ? { right: chip.right } : {}),
            animationDelay: chip.delay,
            animationDuration: chip.duration,
            transform: chip.scale ? `scale(${chip.scale})` : undefined,
          }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-[var(--color-primary-strong)] shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur">
            <Icon name={chip.icon} className="h-3.5 w-3.5" />
            {chip.label}
          </span>
        </div>
      ))}
    </div>
  );
}
