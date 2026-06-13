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
  /** Primer nombre del usuario logueado, para personalizar el saludo (neutro). */
  userName?: string | null;
}

export function HomeView({ historyCount, userName }: HomeViewProps) {
  return (
    <AppShell active="inicio" historialCount={historyCount} fluid>
      <div className="flex flex-col gap-6 py-2 md:py-4">
        <PageHeader userName={userName} />

        {/* NL-504: entrada escalonada — cada bloque sube con un pequeño delay.
            `home-rise-in` se neutraliza con prefers-reduced-motion. */}
        <div className="flex flex-col gap-6">
          <Hero />
          <div className="home-rise-in" style={{ animationDelay: '0.08s' }}>
            <HowItWorks />
          </div>
          <div className="home-rise-in" style={{ animationDelay: '0.16s' }}>
            <Examples />
          </div>
          {historyCount > 0 && (
            <div className="home-rise-in" style={{ animationDelay: '0.24s' }}>
              <HistoryCard count={historyCount} />
            </div>
          )}
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
function PageHeader({ userName }: { userName?: string | null }) {
  return (
    <header className="hidden flex-col gap-1 md:flex">
      <p className="text-[13px] text-[var(--color-text-muted)]">
        Hola{userName ? `, ${userName}` : ''}
      </p>
      <h1 className="text-[26px] font-bold leading-tight text-[var(--color-text)]">
        Te damos la bienvenida
      </h1>
    </header>
  );
}
