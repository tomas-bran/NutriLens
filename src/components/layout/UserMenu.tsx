/**
 * <UserMenu> (NL-201) — pie del sidebar con el usuario logueado + logout.
 * El logout es un `<form>` con server action (`signOut`), sin JS de cliente.
 * Reemplaza al TeamCard estático una vez que hay sesión.
 */
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { signOutAction } from '@/lib/auth/actions';

interface UserMenuProps {
  name: string | null;
  email: string | null;
  image: string | null;
}

export function UserMenu({ name, email, image }: UserMenuProps) {
  const initial = (name ?? email ?? '?').trim().charAt(0).toUpperCase();
  return (
    <div className="mt-auto flex items-center gap-2.5 rounded-[10px] bg-[var(--color-bg)] p-2.5">
      {/* El bloque de usuario lleva a Mi cuenta (NL-201/redesign). */}
      <Link
        href="/mi-cuenta"
        data-testid="user-menu-account"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md transition-colors hover:opacity-80"
      >
        {image ? (
          <Image
            src={image}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-strong)]">
            {initial}
          </span>
        )}
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[11px] font-bold text-[var(--color-text)]">
            {name ?? 'Mi cuenta'}
          </span>
          {email && (
            <span className="truncate text-[10px] text-[var(--color-text-muted)]">{email}</span>
          )}
        </div>
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          data-testid="logout"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-white hover:text-[var(--color-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
