'use client';

/**
 * <UserMenu> (NL-201, rediseño) — pie del sidebar con el usuario logueado.
 * Un botón de tres puntos (⋮) abre un popup con "Ver perfil" (→ /mi-cuenta) y
 * "Cerrar sesión" (server action `signOutAction`). Client por el estado del
 * popup; se cierra al click afuera o con Escape.
 */
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { signOutAction } from '@/lib/auth/actions';

interface UserMenuProps {
  name: string | null;
  email: string | null;
  image: string | null;
}

export function UserMenu({ name, email, image }: UserMenuProps) {
  const initial = (name ?? email ?? '?').trim().charAt(0).toUpperCase();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Cerrar al click afuera o con Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative mt-auto">
      {/* La card del usuario queda abajo; el menú crece hacia arriba desde acá.
          Cuando está abierto, cuadramos las esquinas de arriba para que el menú
          y la card se vean como una sola superficie gris continua. */}
      <div
        className={`rail-center flex items-center gap-2.5 bg-[var(--color-bg)] p-2.5 ${open ? 'rounded-b-2xl rounded-t-none border border-t-0 border-[var(--color-border)]' : 'rounded-[10px]'}`}
      >
        {/* El bloque de usuario lleva a Mi cuenta (atajo). */}
        <Link
          href="/mi-cuenta"
          data-testid="user-menu-account"
          className="rail-center flex min-w-0 flex-1 items-center gap-2.5 rounded-md transition-colors hover:opacity-80"
        >
          <Avatar name={name} email={email} image={image} initial={initial} size={28} />
          <div className="rail-hide flex min-w-0 flex-col leading-tight">
            <span
              title={name ?? undefined}
              className="truncate text-[11px] font-bold text-[var(--color-text)]"
            >
              {name ?? 'Mi cuenta'}
            </span>
            {email && (
              <span title={email} className="truncate text-[10px] text-[var(--color-text-muted)]">
                {email}
              </span>
            )}
          </div>
        </Link>

        <button
          type="button"
          data-testid="user-menu-trigger"
          aria-label="Opciones de cuenta"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rail-hide flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-white hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <Icon name="more-vertical" className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          aria-label="Opciones de cuenta"
          className="nl-menu-pop absolute inset-x-0 bottom-full z-40 overflow-hidden rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5 shadow-[0_-12px_32px_-12px_rgba(15,23,42,0.22)]"
        >
          <MenuLink
            href="/mi-cuenta"
            icon="user"
            label="Mi cuenta"
            onClick={close}
            testid="menu-ver-perfil"
          />
          <MenuLink
            href="/catalogo?filtro=mios"
            icon="history"
            label="Mis análisis"
            onClick={close}
          />
          <MenuLink href="/mi-cuenta#ayuda" icon="info" label="Ayuda" onClick={close} />

          <div className="my-1 h-px bg-[var(--color-border)]" />
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              data-testid="logout"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-[var(--color-danger)] transition-colors hover:bg-[#fef2f2]"
            >
              <Icon name="logout" className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Avatar({
  name,
  email,
  image,
  initial,
  size,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
  initial: string;
  size: number;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={size}
        height={size}
        className="flex-shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-strong)]"
      style={{ width: size, height: size }}
      aria-label={name ?? email ?? undefined}
    >
      {initial}
    </span>
  );
}

function MenuLink({
  href,
  icon,
  label,
  onClick,
  testid,
}: {
  href: string;
  icon: IconName;
  label: string;
  onClick: () => void;
  testid?: string;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      data-testid={testid}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-primary-soft)]"
    >
      <Icon name={icon} className="h-4 w-4 text-[var(--color-text-muted)]" />
      {label}
    </Link>
  );
}
