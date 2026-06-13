/**
 * <SidebarUser> (NL-201) — pie del sidebar: muestra el usuario logueado con
 * logout (<UserMenu>), o un placeholder de equipo si no hay sesión.
 *
 * Es un Server Component async aislado: resuelve `auth()` acá adentro para no
 * tener que volver async toda la cadena AppShell→Sidebar (que romperia los
 * tests que renderizan páginas sincrónicamente).
 */
import { auth } from '@/lib/auth';
import { UserMenu } from './UserMenu';

export async function SidebarUser() {
  const session = await auth();
  if (!session?.user) return <TeamCard />;
  return (
    <UserMenu
      name={session.user.name ?? null}
      email={session.user.email ?? null}
      image={session.user.image ?? null}
    />
  );
}

function TeamCard() {
  return (
    <div className="rail-center mt-auto flex items-center gap-2.5 rounded-[10px] bg-[var(--color-bg)] p-2.5">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-strong)]">
        N
      </span>
      <div className="rail-hide flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[11px] font-bold text-[var(--color-text)]">NutriLens</span>
        <span className="truncate text-[10px] text-[var(--color-text-muted)]">UNLaM</span>
      </div>
    </div>
  );
}
