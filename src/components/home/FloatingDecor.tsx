/**
 * <FloatingDecor> (NL-504) — chips de alérgenos/sellos que "levitan" alrededor
 * del hero. Puramente decorativo (aria-hidden); con prefers-reduced-motion
 * quedan estáticos (las clases `home-float`/`home-glow` se neutralizan en CSS).
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
  { icon: 'wheat', label: 'Sin gluten', top: '12%', right: '8%', delay: '0s', duration: '6s' },
  {
    icon: 'milk',
    label: 'Sin lactosa',
    top: '80%',
    right: '29%',
    delay: '1.2s',
    duration: '7s',
    scale: '0.92',
  },
  {
    icon: 'egg',
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

export function FloatingDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
      {/* Halo que respira detrás de los chips. */}
      <div className="home-glow absolute right-[14%] top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-white/25 blur-3xl" />
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
