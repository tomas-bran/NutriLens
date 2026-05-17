import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:bg-muted',
  ghost:
    'bg-transparent border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:text-muted',
  danger:
    'bg-danger text-white hover:bg-[#c73b40] focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 disabled:bg-muted',
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
