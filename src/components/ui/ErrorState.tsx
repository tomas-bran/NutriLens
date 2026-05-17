import type { ReactNode } from 'react';
import { Button } from './Button';

interface Action {
  label: string;
  onClick: () => void;
}

interface ErrorStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
}

export function ErrorState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: ErrorStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-xl bg-[#fde8e8] p-8 text-center"
    >
      {icon && (
        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white text-[var(--color-danger)]">
          <span aria-hidden="true" className="text-4xl">
            {icon}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-[var(--color-text)]">{title}</h2>
        {description && <p className="text-sm text-[var(--color-text-muted)]">{description}</p>}
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex w-full max-w-xs flex-col gap-2">
          {primaryAction && (
            <Button variant="primary" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
