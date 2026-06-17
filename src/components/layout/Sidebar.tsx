/**
 * Sidebar de escritorio — anclado a la izquierda con `position: fixed`.
 *
 * NL-502 (AB#76, corrección de bug del MVP):
 *   - Desktop (`≥md`): panel fijo de 240px pegado al borde izquierdo
 *     (`fixed inset-y-0 left-0`). Es `fixed`, no `sticky`, así que queda
 *     TOTALMENTE inmóvil: no se mueve con el scroll, el overscroll/rubber-band
 *     ni cuando la barra del browser colapsa. `overflow-y-auto` evita que el
 *     contenido se corte en viewports bajos.
 *   - Mobile (`<md`): el sidebar se oculta (`hidden`) y la navegación pasa al
 *     <MobileBottomNav> (barra inferior). Por eso acá NO hay versión "rail".
 *
 * El espacio que ocupa en desktop lo reserva el grid del <AppShell>
 * (`md:grid-cols-[15rem_1fr]`), cuya primera columna calza con el ancho fijo.
 */
import { NutriMark } from '@/components/ui/NutriMark';
import { SidebarNavLink } from './SidebarNavLink';
import { SidebarNutriWorldLink } from './SidebarNutriWorldLink';
import { SidebarToggle } from './SidebarToggle';
import { SidebarUser } from './SidebarUser';
import { NAV_ITEMS, type ActiveNavItem } from './nav-config';

export interface SidebarProps {
  active?: ActiveNavItem;
  catalogoCount?: number;
}

export function Sidebar({ active, catalogoCount }: SidebarProps) {
  return (
    <aside
      data-testid="app-sidebar"
      className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-[var(--color-border)] bg-white p-5 md:flex"
    >
      <BrandBlock />
      <nav className="flex flex-1 flex-col gap-1.5 pt-2" aria-label="Navegación principal">
        {NAV_ITEMS.filter((item) => !item.mobileOnly && !item.adminOnly).map((item) => (
          <SidebarNavLink
            key={item.id}
            item={item}
            active={active === item.id}
            badge={item.id === 'catalogo' ? catalogoCount : undefined}
          />
        ))}
        {/* Gated por rol (async aislado, como SidebarUser). */}
        <SidebarNutriWorldLink active={active === 'nutriworld'} />
      </nav>
      {/* Componente async aislado: resuelve la sesión sin volver async todo
          el árbol del shell (NL-201). */}
      <SidebarUser />

      {/* Círculo en el borde que colapsa/expande el sidebar (rail de íconos). */}
      <SidebarToggle />
    </aside>
  );
}

function BrandBlock() {
  return (
    <div className="rail-center flex items-center gap-3 pb-4">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
        <NutriMark size={24} />
      </span>
      <div className="rail-hide flex flex-col leading-tight">
        <span className="text-base font-bold text-[var(--color-text)]">NutriLens</span>
      </div>
    </div>
  );
}
