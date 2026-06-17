/**
 * Single source of truth for the app navigation. Consumido por el <Sidebar>
 * (`iLsWo` Pencil component), que es la navegación única en todos los tamaños
 * (completo en desktop, rail de íconos en móvil). Para agregar una ruta, sumá
 * una entrada acá y nada más.
 */
import type { IconName } from '@/components/ui/Icon';

export type ActiveNavItem = 'inicio' | 'analizar' | 'catalogo' | 'chat' | 'perfil';

export interface NavItem {
  id: ActiveNavItem;
  href: string;
  icon: IconName;
  label: string;
  /** Si es true, solo aparece en la barra mobile (en desktop vive en el UserMenu). */
  mobileOnly?: boolean;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { id: 'inicio', href: '/', icon: 'home', label: 'Inicio' },
  { id: 'analizar', href: '/analizar', icon: 'scan-line', label: 'Analizar' },
  { id: 'catalogo', href: '/catalogo', icon: 'salad', label: 'Catálogo' },
  { id: 'chat', href: '/chat', icon: 'chat', label: 'Chat' },
  // Redesign: en desktop el acceso a la cuenta vive en el UserMenu del sidebar;
  // en mobile es una pestaña propia.
  { id: 'perfil', href: '/mi-cuenta', icon: 'user', label: 'Perfil', mobileOnly: true },
];
