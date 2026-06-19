/**
 * Ítem de navegación del <Sidebar>. Extraído a su propio archivo para que lo
 * compartan el Sidebar (links normales) y <SidebarNutriWorldLink> (link gated
 * por rol) sin dependencias circulares.
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { NavItem } from './nav-config';

export interface SidebarNavLinkProps {
  item: NavItem;
  active: boolean;
  badge?: number;
  /** Gated: se ve pero no es clickeable (ej. NutriWorld para no-admins). */
  disabled?: boolean;
}

export function SidebarNavLink({ item, active, badge, disabled }: SidebarNavLinkProps) {
  const hasBadge = typeof badge === 'number' && badge > 0;
  const inner = (
    <>
      <Icon
        name={item.icon}
        strokeWidth={active ? 2.25 : 2}
        className="h-[18px] w-[18px] flex-shrink-0"
      />
      <span className="rail-hide flex-1">{item.label}</span>
      {item.tag && (
        <span className="rail-hide rounded-full bg-[var(--color-primary-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--color-primary)]">
          {item.tag}
        </span>
      )}
      {hasBadge && (
        <span className="rail-hide rounded-full bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)]">
          {badge}
        </span>
      )}
    </>
  );

  if (disabled) {
    return (
      <span
        data-testid={`nav-${item.id}`}
        aria-disabled="true"
        title="Solo para administradores"
        className="rail-center text-[var(--color-text)]/35 flex cursor-not-allowed items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium"
      >
        {inner}
      </span>
    );
  }

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
      {inner}
    </Link>
  );
}
