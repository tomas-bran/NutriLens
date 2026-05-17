import { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'risk-low' | 'risk-medium' | 'risk-high' | 'neutral';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  'risk-low': 'text-[var(--color-risk-low)] bg-[#e6f5ee]',
  'risk-medium': 'text-[var(--color-risk-medium)] bg-[#fef3e2]',
  'risk-high': 'text-[var(--color-risk-high)] bg-[#fde8e8]',
  neutral: 'text-[var(--color-text-muted)] bg-[var(--color-surface)]',
};

const dotClasses: Record<BadgeVariant, string> = {
  'risk-low': 'bg-[var(--color-risk-low)]',
  'risk-medium': 'bg-[var(--color-risk-medium)]',
  'risk-high': 'bg-[var(--color-risk-high)]',
  neutral: 'bg-[var(--color-text-muted)]',
};

export function Badge({ variant = 'neutral', children, className = '', ...rest }: BadgeProps) {
  const showDot = variant !== 'neutral';
  return (
    <span
      {...rest}
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showDot && (
        <span
          aria-hidden="true"
          className={['h-1.5 w-1.5 rounded-full flex-shrink-0', dotClasses[variant]].join(' ')}
        />
      )}
      {children}
    </span>
  );
}
