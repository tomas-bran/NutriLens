/**
 * Home hero section (US-07).
 *
 * Pencil reference: M01-Onboarding `obHero` (brand-600 fill, padding 28,
 * gap 24, lens illustration). Sizing aligned with `g4EjCQ`/M01 typography
 * — h1 fontSize 26-30, NOT a 48px display heading.
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { FloatingDecor } from './FloatingDecor';

export function Hero() {
  return (
    <section
      aria-labelledby="home-hero-title"
      // NL-504: gradiente animado + decoración flotante. `home-rise-in` da la
      // entrada; `home-gradient` el fondo vivo (ambos respetan reduced-motion).
      className="home-rise-in home-gradient relative overflow-hidden rounded-[28px] text-white shadow-[0_20px_60px_-20px_rgba(22,163,74,0.5)]"
    >
      <FloatingDecor />

      <div className="relative grid grid-cols-1 gap-6 px-6 py-10 md:grid-cols-[1.4fr_1fr] md:items-center md:gap-4 md:px-10 md:py-14">
        <div className="flex flex-col gap-4">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[2px] text-white/90 backdrop-blur">
            <Icon name="sparkles" className="h-3 w-3" />
            NutriLens · IA nutricional
          </p>

          <h1 id="home-hero-title" className="text-[28px] font-bold leading-[1.12] md:text-[38px]">
            Entendé qué comés,
            <br />
            <span className="text-[var(--color-accent-lime)]">en segundos.</span>
          </h1>

          <p className="max-w-md text-sm leading-relaxed text-white/90 md:text-[15px]">
            Sacale una foto a la etiqueta y NutriLens te muestra alérgenos, sellos y riesgo en un
            lenguaje claro.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 md:justify-start">
            <Link
              href="/analizar"
              data-testid="hero-cta"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-[var(--color-primary-strong)] shadow-[0_2px_8px_0_rgba(0,0,0,0.12)] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-primary)]"
            >
              <Icon name="camera" strokeWidth={2.25} className="h-4 w-4" />
              Analizar producto
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-primary)]"
            >
              <Icon name="chat" strokeWidth={2.25} className="h-4 w-4" />
              Preguntá al asistente
            </Link>
          </div>
        </div>

        <DecorLens />
      </div>
    </section>
  );
}

/**
 * Las 3 olas: cada anillo arranca su expansión con un desfasaje distinto, así
 * sale una ola nueva cada ~0.8s (animación de 2.4s ÷ 3) de forma continua.
 */
const PULSE_RINGS = ['1.2s', '2.4s', '4.8s'];

/**
 * Chips que ORBITAN el lente: su posición es relativa al lente (que vive en la
 * columna derecha, centrado en su celda). Así se ajustan solos al ancho de la
 * pantalla y nunca invaden la columna de texto — sin percentages del hero.
 */
const LENS_CHIPS: ReadonlyArray<{
  icon: IconName;
  label: string;
  top: string;
  left: string;
  delay: string;
  duration: string;
}> = [
  { icon: 'wheat-off', label: 'Sin gluten', top: '-14%', left: '64%', delay: '0s', duration: '6s' },
  { icon: 'vegan', label: 'Vegano', top: '-4%', left: '20%', delay: '0.6s', duration: '6.5s' },
  { icon: 'nut', label: 'Frutos secos', top: '46%', left: '92%', delay: '2s', duration: '7.5s' },
  { icon: 'milk-off', label: 'Sin lactosa', top: '96%', left: '22%', delay: '1.2s', duration: '7s' },
];

/**
 * Contained scanner-lens illustration on the right of the hero, with the
 * allergen chips orbiting it. Hidden on mobile to keep the CTA above the fold.
 */
function DecorLens() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none hidden items-center justify-center md:flex"
    >
      <div className="relative h-44 w-44">
        <div className="absolute inset-0 rounded-full bg-white/10" />
        <div className="absolute inset-5 rounded-full bg-white/20" />
        {/* Pulsos que emanan del lente — cada anillo es una ola que viaja hacia
            afuera (el efecto "tira pulsos" de una cámara escaneando). */}
        {PULSE_RINGS.map((delay) => (
          <span
            key={delay}
            className="nl-pulse-ring absolute inset-10 rounded-full border-2 border-white/70"
            style={{ animationDelay: delay }}
          />
        ))}
        <div className="absolute inset-10 flex items-center justify-center rounded-full bg-white shadow-[0_8px_24px_0_rgba(0,0,0,0.12)]">
          <Icon name="camera" className="h-12 w-12 text-[var(--color-primary)]" />
        </div>

        {/* Chips orbitando el lente (levitan con home-float). */}
        {LENS_CHIPS.map((chip) => (
          <div
            key={chip.label}
            className="home-float absolute whitespace-nowrap"
            style={{
              top: chip.top,
              left: chip.left,
              animationDelay: chip.delay,
              animationDuration: chip.duration,
            }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-[var(--color-primary-strong)] shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur">
              <Icon name={chip.icon} className="h-3.5 w-3.5" />
              {chip.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
