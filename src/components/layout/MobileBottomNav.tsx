/**
 * <MobileBottomNav> — barra de navegación inferior, solo en mobile (`<md`).
 *
 * NL-502 (AB#76): en pantallas chicas el <Sidebar> izquierdo se oculta y la
 * navegación vive acá, al pie, tal como el `Component/BottomNav` del diseño
 * (Pencil `Q3hjvQ`). Es un hijo EN FLUJO (`flex-shrink-0`) del shell flex-col
 * de alto fijo, así el scroll de `main` termina justo arriba suyo (la barra de
 * scroll no lo abarca). En desktop se oculta (`md:hidden`); ahí manda el sidebar.
 *
 * Comparte la misma fuente de verdad que el sidebar (`NAV_ITEMS`), así que
 * agregar/quitar una ruta se hace en un solo lugar. Respeta el safe-area de
 * los teléfonos con notch (`pb-[env(safe-area-inset-bottom)]`).
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { NAV_ITEMS, type ActiveNavItem } from './nav-config';

export interface MobileBottomNavProps {
  active?: ActiveNavItem;
  catalogoCount?: number;
}

export function MobileBottomNav({ active, catalogoCount }: MobileBottomNavProps) {
  return (
    <nav
      data-testid="app-bottom-nav"
      aria-label="Navegación principal"
      className="flex flex-shrink-0 items-stretch justify-around border-t border-[var(--color-border)] bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.filter((item) => !item.desktopOnly).map((item) => {
        const isActive = active === item.id;
        const badge = item.id === 'catalogo' ? catalogoCount : undefined;
        const hasBadge = typeof badge === 'number' && badge > 0;
        return (
          <Link
            key={item.id}
            href={item.href}
            data-testid={`bottom-nav-${item.id}`}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors',
              isActive
                ? 'font-bold text-[var(--color-primary-strong)]'
                : 'text-[var(--color-text-muted)]',
            )}
          >
            <span className="relative flex items-center justify-center">
              <Icon
                name={item.icon}
                strokeWidth={isActive ? 2.25 : 2}
                className="h-[22px] w-[22px]"
              />
              {hasBadge && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-[var(--color-primary)]"
                />
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
