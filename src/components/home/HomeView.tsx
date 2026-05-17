/**
 * Composition for the home page (US-07).
 *
 * Pencil reference: D01-Home-Upload main column (`j40Fz`) — bg #FAFBF7,
 * padding 32, gap 24, with a top bar (saludo + h1) followed by content.
 * Wraps with `<AppShell>` so the sidebar from `iLsWo` is visible on desktop.
 */
import { AppShell } from '@/components/layout/AppShell';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Examples } from './Examples';
import { Hero } from './Hero';
import { HistoryCard } from './HistoryCard';
import { HowItWorks } from './HowItWorks';

export interface HomeViewProps {
  historyCount: number;
}

export function HomeView({ historyCount }: HomeViewProps) {
  return (
    <AppShell active="inicio" historialCount={historyCount}>
      <div className="flex flex-col gap-6 px-4 py-2 md:px-6 md:py-6">
        <PageHeader />

        <div className="flex flex-col gap-6">
          <Hero />
          <HowItWorks />
          <Examples />
          {historyCount > 0 && <HistoryCard count={historyCount} />}
        </div>

        <footer className="pt-4">
          <Disclaimer />
        </footer>
      </div>
    </AppShell>
  );
}

/**
 * "Hola / ¿Qué vamos a analizar hoy?" top bar — Pencil `dhTL` (fontSize 13
 * eyebrow, fontSize 26 h1). Stays small on mobile where the AppShell shows
 * the brand strip instead.
 */
function PageHeader() {
  return (
    <header className="hidden flex-col gap-1 md:flex">
      <p className="text-[13px] text-[var(--color-text-muted)]">Hola</p>
      <h1 className="text-[26px] font-bold leading-tight text-[var(--color-text)]">
        Bienvenida a NutriLens
      </h1>
    </header>
  );
}
