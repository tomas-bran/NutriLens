/**
 * "Cómo funciona" — 3-step block (US-07, spec E01 §8).
 * Pure presentational. Renders a row on desktop, stacked column on mobile.
 */
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';

interface Step {
  number: number;
  title: string;
  description: string;
  icon: IconName;
}

const STEPS: ReadonlyArray<Step> = [
  {
    number: 1,
    title: 'Sacá una foto',
    description: 'Subí una imagen del frente, ingredientes o tabla nutricional.',
    icon: 'camera',
  },
  {
    number: 2,
    title: 'Esperá unos segundos',
    description: 'NutriLens lee la etiqueta y entiende lo que dice.',
    icon: 'sparkles',
  },
  {
    number: 3,
    title: 'Mirá el análisis',
    description: 'Riesgo, alérgenos y sellos explicados en lenguaje claro.',
    icon: 'line-chart',
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-0.5">
        <h2 id="how-it-works-title" className="text-[18px] font-bold text-[var(--color-text)]">
          Cómo funciona
        </h2>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          En tres pasos sin tener que escribir nada.
        </p>
      </header>

      <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.number} className="h-full">
            <Card
              padding="md"
              className="group relative h-full overflow-hidden transition-colors hover:border-[var(--color-primary)]"
            >
              {/* En hover el fondo del color del ícono se expande circularmente
                  desde el círculo del ícono hasta cubrir toda la card. */}
              <span className="pointer-events-none absolute right-4 top-4 z-0 h-9 w-9 origin-center scale-0 rounded-full bg-[var(--color-primary-soft)] transition-transform duration-700 ease-out group-hover:scale-[32]" />

              <div className="relative z-10 flex h-full flex-col gap-2.5">
                {/* Número grande a la izquierda + ícono, a la misma altura. */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[26px] font-extrabold leading-none text-[var(--color-text-muted)]/40 transition-colors group-hover:text-[var(--color-primary)]">
                    0{step.number}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Icon name={step.icon} className="h-5 w-5" />
                  </span>
                </div>
                <h3 className="text-[15px] font-bold text-[var(--color-text)]">{step.title}</h3>
                <p className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                  {step.description}
                </p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
