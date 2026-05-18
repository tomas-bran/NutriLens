/**
 * <ThinkingDots> — tres puntos animados para el estado THINKING (spec §9.4).
 * Visual: burbuja izquierda con `…` mientras el modelo procesa la respuesta.
 */
export function ThinkingDots() {
  return (
    <div className="flex w-full justify-start" data-testid="chat-thinking">
      <div
        role="status"
        aria-label="Pensando..."
        className="flex items-center gap-1.5 rounded-3xl rounded-bl-md border border-[var(--color-border)] bg-white px-4 py-3 shadow-sm"
      >
        <span className="sr-only">Pensando...</span>
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary)]"
          style={{ animationDelay: '0ms' }}
          aria-hidden="true"
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary)]"
          style={{ animationDelay: '120ms' }}
          aria-hidden="true"
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary)]"
          style={{ animationDelay: '240ms' }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
