import type { ReactNode } from 'react';
import { Button } from './Button';

interface Action {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: Action;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-xl bg-[var(--color-surface)] p-8 text-center"
    >
      {icon && (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <span aria-hidden="true" className="text-3xl">
            {icon}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-[var(--color-text)]">{title}</h2>
        {description && (
          <p className="max-w-xs text-sm text-[var(--color-text-muted)]">{description}</p>
        )}
      </div>

      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
