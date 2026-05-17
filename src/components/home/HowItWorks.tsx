/**
 * "Cómo funciona" — 3-step block (US-07, spec E01 §8).
 * Pure presentational. Renders a row on desktop, stacked column on mobile.
 */
import { Card } from '@/components/ui/Card';

interface Step {
  number: number;
  title: string;
  description: string;
  icon: 'camera' | 'sparkles' | 'chart';
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
    description: 'NutriLens analiza la etiqueta con IA multimodal.',
    icon: 'sparkles',
  },
  {
    number: 3,
    title: 'Mirá el análisis',
    description: 'Riesgo, alérgenos y sellos explicados en lenguaje claro.',
    icon: 'chart',
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
            <Card padding="md" className="flex h-full flex-col gap-2.5 !rounded-[14px] !p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <StepIcon kind={step.icon} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[var(--color-primary-strong)]">
                  Paso {step.number}
                </span>
              </div>
              <h3 className="text-[15px] font-bold text-[var(--color-text)]">{step.title}</h3>
              <p className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                {step.description}
              </p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepIcon({ kind }: { kind: Step['icon'] }) {
  const common = {
    'aria-hidden': true,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'h-5 w-5',
  } as const;

  if (kind === 'camera') {
    return (
      <svg {...common}>
        <path d="M14.5 4l1.5 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2h5z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    );
  }
  if (kind === 'sparkles') {
    return (
      <svg {...common}>
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
        <path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
        <path d="M5 17l.5 1.5 1.5.5-1.5.5L5 21l-.5-1.5L3 19l1.5-.5z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3 3v18h18" />
      <path d="M7 16l4-6 4 3 5-8" />
    </svg>
  );
}
