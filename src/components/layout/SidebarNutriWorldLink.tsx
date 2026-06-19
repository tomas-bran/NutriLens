/**
 * Link de NutriWorld en el sidebar, gated por rol. Componente async aislado
 * (como <SidebarUser>) para que el resto del <Sidebar> siga siendo sync y no
 * arrastre `auth()` a todo el árbol. NutriWorld es beta admin-only: los
 * no-admins NO ven el item (no aparece). Solo los admins whitelisteados lo ven.
 */
import { isCurrentUserAdmin } from '@/lib/auth/is-admin';
import { NAV_ITEMS } from './nav-config';
import { SidebarNavLink } from './SidebarNavLink';

const NUTRIWORLD_ITEM = NAV_ITEMS.find((i) => i.id === 'nutriworld')!;

export async function SidebarNutriWorldLink({ active }: { active: boolean }) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return null;
  return <SidebarNavLink item={NUTRIWORLD_ITEM} active={active} />;
}
