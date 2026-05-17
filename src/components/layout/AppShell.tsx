/**
 * <AppShell> — desktop sidebar + mobile bottom nav wrapper.
 *
 * Pencil references:
 *   - `iLsWo` Component/Desktop/Sidebar (desktop ≥768px)
 *   - `Z2rHzQ` Component/Mobile/BottomNav (mobile <768px)
 *   - `h4PArD` D01 layout (sidebar 240px + main #FAFBF7 padding 32 gap 24)
 *
 * Mobile: sidebar hidden, slim brand strip at the top, fixed bottom nav with
 * 4 items (Inicio / Analizar / Historial / Chat). Main content gets bottom
 * padding so the nav doesn't overlap.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

export type ActiveNavItem = 'inicio' | 'analizar' | 'historial' | 'chat';

export interface AppShellProps {
  active?: ActiveNavItem;
  /** Optional badge count next to the Historial nav item. */
  historialCount?: number;
  children: ReactNode;
}

export function AppShell({ active, historialCount, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-4 pb-24 md:pb-4">
      <div className="mx-auto flex max-w-[1280px] items-start gap-4">
        <Sidebar active={active} historialCount={historialCount} />
        <main className="flex w-full min-w-0 flex-col gap-6 rounded-3xl bg-[var(--color-bg)] md:gap-6 md:p-2">
          <MobileTopBar />
          {children}
        </main>
      </div>
      <MobileBottomNav active={active} historialCount={historialCount} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar (desktop only)
// ---------------------------------------------------------------------------

function Sidebar({ active, historialCount }: { active?: ActiveNavItem; historialCount?: number }) {
  return (
    <aside
      data-testid="app-sidebar"
      className="sticky top-4 hidden h-[calc(100vh-2rem)] w-60 flex-shrink-0 flex-col gap-1.5 rounded-3xl border border-[var(--color-border)] bg-white p-5 md:flex"
    >
      <BrandBlock />
      <nav className="flex flex-col gap-1.5 pt-2" aria-label="Navegación principal">
        <NavItem href="/" icon="home" label="Inicio" active={active === 'inicio'} />
        <NavItem
          href="/analizar"
          icon="scan-line"
          label="Analizar"
          active={active === 'analizar'}
        />
        <NavItem
          href="/historial"
          icon="history"
          label="Historial"
          active={active === 'historial'}
          badge={historialCount}
        />
        <NavItem href="/chat" icon="chat" label="Chat" active={active === 'chat'} />
      </nav>
      <div className="mt-auto">
        <TeamCard />
      </div>
    </aside>
  );
}

function BrandBlock() {
  return (
    <div className="flex items-center gap-3 pb-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
        <BrandLogo />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-base font-bold text-[var(--color-text)]">NutriLens</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">MVP · v0.1</span>
      </div>
    </div>
  );
}

interface NavItemProps {
  href: string;
  icon: 'home' | 'scan-line' | 'history' | 'chat';
  label: string;
  active?: boolean;
  badge?: number;
}

function NavItem({ href, icon, label, active = false, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      data-testid={`nav-${label.toLowerCase()}`}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors',
        active
          ? 'bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary-strong)]'
          : 'text-[var(--color-text)]/80 hover:bg-[var(--color-surface)]',
      ].join(' ')}
    >
      <NavIcon name={icon} active={active} />
      <span className="flex-1">{label}</span>
      {typeof badge === 'number' && badge > 0 && (
        <span className="rounded-full bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)]">
          {badge}
        </span>
      )}
    </Link>
  );
}

function TeamCard() {
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] bg-[var(--color-bg)] p-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-strong)]">
        F
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[11px] font-bold text-[var(--color-text)]">
          Equipo NutriLens
        </span>
        <span className="truncate text-[10px] text-[var(--color-text-muted)]">4 · UNLaM</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile top brand strip (visible <md).
// ---------------------------------------------------------------------------

function MobileTopBar() {
  return (
    <div className="flex items-center gap-3 px-4 pt-2 md:hidden">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
        <BrandLogo />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-[var(--color-text)]">NutriLens</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">MVP · v0.1</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile bottom navigation (visible <md). Pencil `Z2rHzQ` Component/Mobile/BottomNav.
// ---------------------------------------------------------------------------

function MobileBottomNav({
  active,
  historialCount,
}: {
  active?: ActiveNavItem;
  historialCount?: number;
}) {
  return (
    <nav
      data-testid="app-bottom-nav"
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-[#f1f5f9] bg-white px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 md:hidden"
    >
      <BottomNavItem href="/" icon="home" label="Inicio" active={active === 'inicio'} />
      <BottomNavItem
        href="/analizar"
        icon="scan-line"
        label="Analizar"
        active={active === 'analizar'}
      />
      <BottomNavItem
        href="/historial"
        icon="history"
        label="Historial"
        active={active === 'historial'}
        badge={historialCount}
      />
      <BottomNavItem href="/chat" icon="chat" label="Chat" active={active === 'chat'} />
    </nav>
  );
}

interface BottomNavItemProps {
  href: string;
  icon: NavItemProps['icon'];
  label: string;
  active?: boolean;
  badge?: number;
}

function BottomNavItem({ href, icon, label, active = false, badge }: BottomNavItemProps) {
  return (
    <Link
      href={href}
      data-testid={`bottom-nav-${label.toLowerCase()}`}
      aria-current={active ? 'page' : undefined}
      className="relative flex flex-1 flex-col items-center gap-1 px-2 py-1.5"
    >
      <span
        className={[
          'flex items-center justify-center',
          active ? 'text-[var(--color-primary)]' : 'text-[#94a3b8]',
        ].join(' ')}
      >
        <BottomNavIcon name={icon} />
        {typeof badge === 'number' && badge > 0 && (
          <span className="absolute right-[calc(50%-18px)] top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[9px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span
        className={[
          'text-[10px]',
          active
            ? 'font-bold text-[var(--color-primary)]'
            : 'font-medium text-[var(--color-text-muted)]',
        ].join(' ')}
      >
        {label}
      </span>
    </Link>
  );
}

function BottomNavIcon({ name }: { name: NavItemProps['icon'] }) {
  // 24px icons per Pencil `Z2rHzQ` spec.
  const common = {
    'aria-hidden': true,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'h-6 w-6',
  } as const;

  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    );
  }
  if (name === 'scan-line') {
    return (
      <svg {...common}>
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M7 12h10" />
      </svg>
    );
  }
  if (name === 'history') {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Icons (lucide line-art, hand-rolled to avoid the dep).
// ---------------------------------------------------------------------------

function BrandLogo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function NavIcon({ name, active }: { name: NavItemProps['icon']; active: boolean }) {
  const common = {
    'aria-hidden': true,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: active ? 2.25 : 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'h-[18px] w-[18px]',
  } as const;

  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    );
  }
  if (name === 'scan-line') {
    return (
      <svg {...common}>
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M7 12h10" />
      </svg>
    );
  }
  if (name === 'history') {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
