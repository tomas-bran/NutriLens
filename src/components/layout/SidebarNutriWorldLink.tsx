/**
 * Link de NutriWorld en el sidebar, gated por rol. Componente async aislado
 * (como <SidebarUser>) para que el resto del <Sidebar> siga siendo sync y no
 * arrastre `auth()` a todo el árbol. Para no-admins el item aparece DISABLED.
 */
import { isCurrentUserAdmin } from '@/lib/auth/is-admin';
import { NAV_ITEMS } from './nav-config';
import { SidebarNavLink } from './SidebarNavLink';

const NUTRIWORLD_ITEM = NAV_ITEMS.find((i) => i.id === 'nutriworld')!;

export async function SidebarNutriWorldLink({ active }: { active: boolean }) {
  const isAdmin = await isCurrentUserAdmin();
  return <SidebarNavLink item={NUTRIWORLD_ITEM} active={active} disabled={!isAdmin} />;
}
