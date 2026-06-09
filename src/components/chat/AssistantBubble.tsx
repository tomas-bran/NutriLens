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
import { ProductChip } from '@/components/chat/ProductChip';
import { MarkdownMini, hasMarkdownTable } from '@/components/chat/markdown-mini';
import type { ChatProductRef } from '@/lib/chat/response';
import type { ChatFallback } from '@/lib/chat/empty-response';

interface AssistantBubbleProps {
  text: string;
  products: ChatProductRef[];
  fallback: ChatFallback | null;
  /** NL-702: fires when user clicks "Preguntar sobre esta comparación". */
  onAskFollowUp?: (prefill: string) => void;
}

export function AssistantBubble({ text, products, fallback, onAskFollowUp }: AssistantBubbleProps) {
  const isMarkdown = hasMarkdownTable(text);

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
          className="rounded-3xl rounded-bl-md border border-[var(--color-border)] bg-white px-4 py-3 text-sm leading-relaxed text-[var(--color-text)] shadow-sm md:px-5 md:py-4 md:text-base"
        >
          {isMarkdown ? <MarkdownMini text={text} /> : text}
        </div>

        {products.length > 0 && (
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

        {isMarkdown && onAskFollowUp && (
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

        {fallback?.showAnalyzeCta && (
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
