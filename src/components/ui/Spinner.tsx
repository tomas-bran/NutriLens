type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
};

export function Spinner({ size = 'md', label = 'Cargando…' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center justify-center">
      <span
        aria-hidden="true"
        className={[
          'animate-spin rounded-full border-[var(--color-border)] border-t-[var(--color-primary)]',
          sizeClasses[size],
        ].join(' ')}
      />
    </span>
  );
}
