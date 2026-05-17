/**
 * Home hero section (US-07).
 *
 * Pencil reference: M01-Onboarding `obHero` (brand-600 fill, padding 28,
 * gap 24, lens illustration). Sizing aligned with `g4EjCQ`/M01 typography
 * — h1 fontSize 26-30, NOT a 48px display heading.
 */
import Link from 'next/link';

export function Hero() {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative overflow-hidden rounded-[24px] bg-[var(--color-primary)] text-white"
    >
      <div className="grid grid-cols-1 gap-6 px-6 py-8 md:grid-cols-[1.4fr_1fr] md:items-center md:gap-4 md:px-10 md:py-10">
        {/* Left: copy + CTA */}
        <div className="flex flex-col gap-4">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[2px] text-white/80">
            <SparkIcon />
            NutriLens
          </p>

          <h1 id="home-hero-title" className="text-[26px] font-bold leading-[1.15] md:text-[32px]">
            Entendé qué comés,
            <br />
            en segundos.
          </h1>

          <p className="max-w-md text-sm leading-relaxed text-white/90 md:text-[15px]">
            Sacale una foto a la etiqueta y NutriLens te muestra alérgenos, sellos y riesgo en un
            lenguaje claro.
          </p>

          <div className="pt-1">
            <Link
              href="/analizar"
              data-testid="hero-cta"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-[var(--color-primary-strong)] shadow-[0_2px_8px_0_rgba(0,0,0,0.12)] transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-primary)]"
            >
              <CameraIcon />
              Analizar producto
            </Link>
          </div>
        </div>

        {/* Right: contained lens illustration (decorative) */}
        <DecorLens />
      </div>
    </section>
  );
}

function SparkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
    >
      <path d="M9 18l1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
      <path d="M19 5l.5-1.5L21 3l-1.5-.5L19 1l-.5 1.5L17 3l1.5.5z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M14.5 4l1.5 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2h5z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

/**
 * Contained scanner-lens illustration on the right of the hero.
 * Hidden on mobile to keep the CTA prominent above the fold.
 * Sized to fit the hero block — no negative offsets, no cropping.
 */
function DecorLens() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none hidden items-center justify-center md:flex"
    >
      <div className="relative h-44 w-44">
        <div className="bg-white/12 absolute inset-0 rounded-full" />
        <div className="bg-white/18 absolute inset-5 rounded-full" />
        <div className="absolute inset-10 flex items-center justify-center rounded-full bg-white shadow-[0_8px_24px_0_rgba(0,0,0,0.12)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-12 w-12 text-[var(--color-primary)]"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        {/* Sparkle decor */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="absolute -left-2 top-4 h-5 w-5 text-[#A3E635]"
        >
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="absolute -right-1 bottom-3 h-4 w-4 text-[#A3E635]"
        >
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
        </svg>
      </div>
    </div>
  );
}
