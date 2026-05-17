/**
 * <Toast> — presentational toast notification.
 * Pencil refs: `GXqpU` Success / `RpXBZ` Error / `gwHlb` Warning / `oyVcr` Info.
 *
 * White card, cornerRadius 16, padding 16, variant-tinted border + drop
 * shadow, icon bubble on the left (variant-100 bg, variant-500 stroke),
 * title + optional description, dismiss `×` on the right.
 *
 * Toasts are consumed via `useToast()` and rendered by `<Toaster>`. This
 * component is rendered by `<Toaster>` only — application code uses the hook.
 */
import type { ReactNode } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  variant: ToastVariant;
  title: string;
  description?: string;
  onDismiss?: () => void;
}

interface VariantStyles {
  icon: ReactNode;
  iconColor: string;
  bubbleBg: string;
  borderColor: string;
  shadowColor: string;
}

const VARIANTS: Record<ToastVariant, VariantStyles> = {
  success: {
    icon: <CheckIcon />,
    iconColor: '#10b981',
    bubbleBg: '#d1fae5',
    borderColor: '#d1fae5',
    shadowColor: 'rgba(16, 185, 129, 0.2)',
  },
  error: {
    icon: <AlertCircleIcon />,
    iconColor: '#ef4444',
    bubbleBg: '#fee2e2',
    borderColor: '#fee2e2',
    shadowColor: 'rgba(239, 68, 68, 0.2)',
  },
  warning: {
    icon: <AlertTriangleIcon />,
    iconColor: '#f59e0b',
    bubbleBg: '#fef3c7',
    borderColor: '#fef3c7',
    shadowColor: 'rgba(245, 158, 11, 0.2)',
  },
  info: {
    icon: <InfoIcon />,
    iconColor: '#3b82f6',
    bubbleBg: '#dbeafe',
    borderColor: '#dbeafe',
    shadowColor: 'rgba(59, 130, 246, 0.2)',
  },
};

export function Toast({ variant, title, description, onDismiss }: ToastProps) {
  const styles = VARIANTS[variant];
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={`toast-${variant}`}
      className="flex items-center gap-3 rounded-2xl border bg-white p-4"
      style={{
        borderColor: styles.borderColor,
        boxShadow: `0 8px 24px 0 ${styles.shadowColor}`,
      }}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: styles.bubbleBg, color: styles.iconColor }}
      >
        {styles.icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[14px] font-bold text-[var(--color-text)]">{title}</p>
        {description && (
          <p className="truncate text-[12px] text-[var(--color-text-muted)]">{description}</p>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar notificación"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
