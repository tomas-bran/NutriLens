import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  removable?: boolean;
  onClick?: () => void;
}

export function Chip({ children, removable = false, onClick, className = '', ...rest }: ChipProps) {
  const isInteractive = !!onClick || removable;

  return (
    <button
      {...rest}
      type="button"
      onClick={onClick}
      aria-label={removable && typeof children === 'string' ? `Quitar ${children}` : undefined}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)]',
        'bg-white px-3 py-1 text-sm font-medium text-[var(--color-text)]',
        'transition-colors',
        isInteractive
          ? 'cursor-pointer hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1'
          : 'cursor-default',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
      {removable && (
        <span aria-hidden="true" className="ml-0.5 text-[var(--color-text-muted)]">
          ×
        </span>
      )}
    </button>
  );
}
