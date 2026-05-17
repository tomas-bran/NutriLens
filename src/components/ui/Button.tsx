import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

// Drop-shadow values come from the Pencil design system (`S1Vi2z` Primary,
// `bz7jC` Danger): rgba(22,163,74,0.25) and rgba(239,68,68,0.25) respectively,
// with blur=8, y=2 — encoded as Tailwind arbitrary shadow utilities below.
const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-white shadow-[0_2px_8px_0_rgba(22,163,74,0.25)] hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:bg-muted disabled:shadow-none',
  ghost:
    'bg-transparent border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:text-muted',
  danger:
    'bg-danger text-white shadow-[0_2px_8px_0_rgba(239,68,68,0.25)] hover:bg-[#dc2626] focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 disabled:bg-muted disabled:shadow-none',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-1.5 text-sm gap-1.5',
  md: 'px-6 py-2.5 text-sm gap-2',
  lg: 'px-8 py-3 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center rounded-full font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}
