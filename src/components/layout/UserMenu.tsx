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
      <div className="flex items-center gap-2.5 rounded-[10px] bg-[var(--color-bg)] p-2.5">
        {/* El bloque de usuario lleva a Mi cuenta (atajo). */}
        <Link
          href="/mi-cuenta"
          data-testid="user-menu-account"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md transition-colors hover:opacity-80"
        >
          <Avatar name={name} email={email} image={image} initial={initial} size={28} />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[11px] font-bold text-[var(--color-text)]">
              {name ?? 'Mi cuenta'}
            </span>
            {email && (
              <span className="truncate text-[10px] text-[var(--color-text-muted)]">{email}</span>
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
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-white hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <Icon name="more-vertical" className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          aria-label="Opciones de cuenta"
          className="nl-menu-pop absolute inset-x-0 bottom-[calc(100%+6px)] z-40 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-1.5 shadow-[0_16px_40px_-10px_rgba(15,23,42,0.3)]"
        >
          {/* Identidad */}
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar name={name} email={email} image={image} initial={initial} size={32} />
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-bold text-[var(--color-text)]">
                {name ?? 'Mi cuenta'}
              </div>
              {email && (
                <div className="truncate text-[11px] text-[var(--color-text-muted)]">{email}</div>
              )}
            </div>
          </div>
          <div className="my-1 h-px bg-[var(--color-border)]" />

          <MenuLink
            href="/mi-cuenta"
            icon="user"
            label="Mi cuenta"
            onClick={close}
            testid="menu-ver-perfil"
          />
          <MenuLink
            href="/historial?filtro=mios"
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
