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
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { NutriMark } from '@/components/ui/NutriMark';
import { cn } from '@/lib/cn';
import { SidebarToggle } from './SidebarToggle';
import { SidebarUser } from './SidebarUser';
import { NAV_ITEMS, type ActiveNavItem, type NavItem } from './nav-config';

export interface SidebarProps {
  active?: ActiveNavItem;
  historialCount?: number;
}

export function Sidebar({ active, historialCount }: SidebarProps) {
  return (
    <aside
      data-testid="app-sidebar"
      className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-[var(--color-border)] bg-white p-5 md:flex"
    >
      <BrandBlock />
      <nav className="flex flex-1 flex-col gap-1.5 pt-2" aria-label="Navegación principal">
        {NAV_ITEMS.filter((item) => !item.mobileOnly).map((item) => (
          <SidebarNavLink
            key={item.id}
            item={item}
            active={active === item.id}
            badge={item.id === 'historial' ? historialCount : undefined}
          />
        ))}
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

interface SidebarNavLinkProps {
  item: NavItem;
  active: boolean;
  badge: number | undefined;
}

function SidebarNavLink({ item, active, badge }: SidebarNavLinkProps) {
  const hasBadge = typeof badge === 'number' && badge > 0;
  return (
    <Link
      href={item.href}
      data-testid={`nav-${item.id}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rail-center flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors',
        active
          ? 'bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary-strong)]'
          : 'text-[var(--color-text)]/80 hover:bg-[var(--color-surface)]',
      )}
    >
      <Icon
        name={item.icon}
        strokeWidth={active ? 2.25 : 2}
        className="h-[18px] w-[18px] flex-shrink-0"
      />
      <span className="rail-hide flex-1">{item.label}</span>
      {hasBadge && (
        <span className="rail-hide rounded-full bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)]">
          {badge}
        </span>
      )}
    </Link>
  );
}
