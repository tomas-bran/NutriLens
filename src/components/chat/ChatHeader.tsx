/**
 * <ChatHeader> — encabezado del chat con título, contador de productos en la
 * base y un botón "Nueva conversación" (US-27 escenario 3).
 *
 * Pencil ref: `BnVAC` (mobile chTop) y `DR7SM` (desktop dcTop).
 */
import { Icon } from '@/components/ui/Icon';

interface ChatHeaderProps {
  productsInBase: number;
  hasMessages: boolean;
  onReset: () => void;
}

export function ChatHeader({ productsInBase, hasMessages, onReset }: ChatHeaderProps) {
  return (
    <header className="flex w-full items-center justify-between gap-3 border-b border-[var(--color-border)] bg-white px-4 py-3 md:rounded-2xl md:border md:px-6 md:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
        >
          <Icon name="chat" className="h-4 w-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-sm font-bold text-[var(--color-text)] md:text-base">
            Chat NutriLens
          </h1>
          <p className="truncate text-xs text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]"
              />
              Listo · {productsInBase} {productsInBase === 1 ? 'producto' : 'productos'} en tu base
            </span>
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={!hasMessages}
        data-testid="chat-new-conversation"
        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-text)] md:px-4 md:py-2 md:text-sm"
      >
        <Icon name="close" className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Nueva conversación</span>
        <span className="sm:hidden">Nueva</span>
      </button>
    </header>
  );
}
