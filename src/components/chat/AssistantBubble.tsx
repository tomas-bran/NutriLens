/**
 * <AssistantBubble> — respuesta del asistente: avatar circular + bubble blanca
 * con el texto, chips de productos referenciados (US-32) y, cuando aplica, un
 * CTA "Analizar nuevo producto" (US-30 §2 — solo cuando el retrieve fue vacío).
 *
 * Visual: Pencil M12 (`Z4G8i3` — bot bubble + product cards) y D05 (`AaLor`).
 *
 * El disclaimer del chat ya viene embebido en `text` desde el back (sanitize
 * en `generateChatAnswer` con `CHAT_DISCLAIMER_TAIL`). No lo duplicamos acá.
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { ProductChip } from '@/components/chat/ProductChip';
import { MarkdownMessage } from '@/components/chat/MarkdownMessage';
import type { ChatProductRef } from '@/lib/chat/response';
import type { ChatFallback } from '@/lib/chat/empty-response';

interface AssistantBubbleProps {
  text: string;
  products: ChatProductRef[];
  fallback: ChatFallback | null;
  /**
   * NL-304: este mensaje todavía se está streameando. Mientras tanto mostramos
   * solo el texto en vivo (con puntos de "escribiendo" si aún está vacío) y
   * diferimos los extras (lista de productos, CTA, follow-up) hasta `done` —
   * así las cards no aparecen a medio escribir.
   */
  streaming?: boolean;
  /** NL-702: fires when user clicks "Preguntar sobre esta comparación". */
  onAskFollowUp?: (prefill: string) => void;
}

export function AssistantBubble({
  text,
  products,
  fallback,
  streaming = false,
  onAskFollowUp,
}: AssistantBubbleProps) {
  const isMarkdown = hasMarkdownTable(text);
  const showExtras = !streaming;
  const isTyping = streaming && text.length === 0;

  return (
    <div className="flex w-full justify-start gap-2.5">
      <div
        aria-hidden="true"
        className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-primary)]"
      >
        <Icon name="sparkles" className="h-4 w-4" />
      </div>

      <div className="flex max-w-[85%] flex-1 flex-col gap-3 md:max-w-[80%]">
        <div
          data-testid="chat-assistant-bubble"
          className={cn(
            'rounded-3xl rounded-bl-md border border-[var(--color-border)] bg-white px-4 py-3 text-sm leading-relaxed text-[var(--color-text)] shadow-sm md:px-5 md:py-4 md:text-base',
            // Mientras solo hay puntos de "escribiendo", la burbuja se achica al
            // contenido en vez de estirarse a todo el ancho (NL-304).
            isTyping && 'w-fit',
          )}
        >
          {isTyping ? <TypingDots /> : <MarkdownMessage text={text} />}
        </div>

        {showExtras && products.length > 0 && (
          <ul
            data-testid="chat-products-list"
            className="flex flex-col gap-2"
            aria-label="Productos usados como contexto"
          >
            {products.map((p, idx) => (
              <li key={p.id}>
                <ProductChip product={p} rank={idx + 1} />
              </li>
            ))}
          </ul>
        )}

        {showExtras && isMarkdown && onAskFollowUp && (
          <button
            type="button"
            data-testid="chat-ask-follow-up"
            onClick={() => onAskFollowUp('¿Tengo una pregunta sobre esta comparación: ')}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            <Icon name="sparkles" className="h-3.5 w-3.5" aria-hidden="true" />
            Preguntar sobre esta comparación
          </button>
        )}

        {showExtras && fallback?.showAnalyzeCta && (
          <Link
            href="/analizar"
            data-testid="chat-analyze-cta"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_0_rgba(22,163,74,0.25)] transition-colors hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            <Icon name="scan-line" className="h-4 w-4" aria-hidden="true" />
            Analizar nuevo producto
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Puntos de "escribiendo" dentro de la burbuja, mientras llega el primer token
 * del stream (NL-304). Evita la burbuja en blanco que se veía antes.
 */
function TypingDots() {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="status"
      aria-label="Escribiendo…"
      data-testid="chat-typing"
    >
      <span className="sr-only">Escribiendo…</span>
      {[0, 120, 240].map((delay) => (
        <span
          key={delay}
          aria-hidden="true"
          className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary)]"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * Detecta una tabla GFM (fila de celdas + fila separadora) para mostrar el
 * CTA de seguimiento (NL-702). Antes vivía en markdown-mini (reemplazado por
 * react-markdown en NL-303).
 */
function hasMarkdownTable(text: string): boolean {
  return /^\|.+\|\s*$/m.test(text) && /^\|[\s:|-]+\|\s*$/m.test(text);
}
