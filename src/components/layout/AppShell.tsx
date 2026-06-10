/**
 * <AppShell> — layout raíz: navegación + área de contenido, responsive.
 *
 * NL-502 (AB#76):
 *   - Desktop (`≥md`): grid `md:grid-cols-[15rem_1fr]`. La primera columna
 *     (15rem = 240px) reserva el hueco del <Sidebar>, que está `position:
 *     fixed` y por lo tanto fuera del flujo; la segunda es el contenido. El
 *     ancho de la columna calza con el `w-60` del sidebar para que no se
 *     solapen.
 *   - Mobile (`<md`): columna flex de alto fijo (`h-[100dvh]`). El scroll vive
 *     DENTRO de `main` (`flex-1 overflow-y-auto`), no en el documento, así la
 *     barra de scroll termina justo arriba del <MobileBottomNav> y no lo
 *     abarca. El bottom nav es un hijo en flujo (`flex-shrink-0`) al pie.
 *
 * Pencil refs: `iLsWo` Component/Desktop/Sidebar + `Q3hjvQ` Component/BottomNav.
 */
import type { ReactNode } from 'react';
import { MobileBottomNav } from './MobileBottomNav';
import { Sidebar } from './Sidebar';
import type { ActiveNavItem } from './nav-config';

export type { ActiveNavItem };

export interface AppShellProps {
  active?: ActiveNavItem;
  /** Optional badge count next to the Historial nav item. */
  historialCount?: number;
  children: ReactNode;
}

export function AppShell({ active, historialCount, children }: AppShellProps) {
  return (
    <div
      data-testid="app-shell"
      className="flex h-[100dvh] flex-col bg-[var(--color-bg)] md:grid md:h-auto md:min-h-screen md:grid-cols-[15rem_1fr]"
    >
      <Sidebar active={active} historialCount={historialCount} />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-3 md:col-start-2 md:block md:overflow-y-visible md:px-6 md:py-6">
        <div className="mx-auto flex min-h-0 w-full max-w-[1100px] flex-1 flex-col gap-6">
          {children}
        </div>
      </main>
      <MobileBottomNav active={active} historialCount={historialCount} />
    </div>
  );
}
