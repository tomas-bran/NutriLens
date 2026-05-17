'use client';

/**
 * <ToastProvider> + <Toaster> + useToast hook.
 *
 * Stack-based notification system. App code calls `useToast()` and gets a
 * `showToast(opts)` function; the `<Toaster>` (mounted near the document
 * root) renders the stack and auto-dismisses each item after `durationMs`
 * (default 4s).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Toast } from './Toast';
import type { ToastVariant } from './Toast';

export interface ToastOptions {
  variant: ToastVariant;
  title: string;
  description?: string;
  /** Auto-dismiss timeout in ms; pass 0 to keep the toast until the user closes it. */
  durationMs?: number;
}

interface ToastEntry extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  showToast: (opts: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (opts: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { ...opts, id }]);
      const duration = opts.durationMs ?? DEFAULT_DURATION_MS;
      if (duration > 0) {
        setTimeout(() => dismissToast(id), duration);
      }
      return id;
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

/**
 * Visible stack of toasts — bottom-right on desktop, top on mobile.
 * Separate component (not exported) so consumers don't accidentally mount
 * a second instance.
 */
function Toaster({ toasts, onDismiss }: { toasts: ToastEntry[]; onDismiss: (id: string) => void }) {
  // SSR safety — only render the portal client-side
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || toasts.length === 0) return null;

  return (
    <div
      data-testid="toaster"
      aria-live="polite"
      aria-label="Notificaciones"
      className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:top-auto md:max-w-sm"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast
            variant={t.variant}
            title={t.title}
            description={t.description}
            onDismiss={() => onDismiss(t.id)}
          />
        </div>
      ))}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be called inside <ToastProvider>');
  }
  return ctx;
}
