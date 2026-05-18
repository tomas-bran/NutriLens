/**
 * <ChatErrorBanner> — banner inline para el estado ERROR (spec §9.4). Muestra
 * el mensaje del backend y un botón para reintentar la última pregunta.
 */
import { Icon } from '@/components/ui/Icon';

interface ChatErrorBannerProps {
  message: string;
  onRetry: () => void;
  canRetry: boolean;
}

export function ChatErrorBanner({ message, onRetry, canRetry }: ChatErrorBannerProps) {
  return (
    <div
      role="alert"
      data-testid="chat-error"
      className="flex w-full items-start gap-3 rounded-2xl border border-[var(--color-risk-high)] bg-[var(--color-risk-high-bg)] px-4 py-3"
    >
      <Icon
        name="triangle-alert"
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-risk-high)]"
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm font-medium text-[var(--color-risk-high)]">{message}</p>
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            data-testid="chat-retry"
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-risk-high)] transition-colors hover:bg-[var(--color-risk-high-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-risk-high)] focus-visible:ring-offset-2"
          >
            <Icon name="arrow-right" className="h-3.5 w-3.5" aria-hidden="true" />
            Reintentar último mensaje
          </button>
        )}
      </div>
    </div>
  );
}
