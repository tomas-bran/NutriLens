/**
 * <ChatThread> — lista vertical de mensajes + indicador de "pensando" mientras
 * se espera el primer token (THINKING). El autoscroll lo maneja el contenedor
 * scrollable del page (`useStickyAutoscroll`, NL-305), no este componente.
 *
 * No persistimos el thread en DB (spec §9.3). El page lo mantiene en memoria.
 */
'use client';

import { AssistantBubble } from '@/components/chat/AssistantBubble';
import { ThinkingDots } from '@/components/chat/ThinkingDots';
import { UserBubble } from '@/components/chat/UserBubble';
import type { ChatMessage, ChatStatus } from '@/components/chat/types';

interface ChatThreadProps {
  messages: ChatMessage[];
  status: ChatStatus;
  onAskFollowUp?: (prefill: string) => void;
}

export function ChatThread({ messages, status, onAskFollowUp }: ChatThreadProps) {
  // El mensaje que se está streameando es el último del asistente mientras el
  // estado es STREAMING. Le pasamos `streaming` para diferir sus extras (cards)
  // y mostrar "escribiendo…" hasta que llegue texto.
  const streamingId =
    status === 'STREAMING'
      ? [...messages].reverse().find((m) => m.role === 'assistant')?.id
      : undefined;

  return (
    <div
      data-testid="chat-thread"
      className="flex w-full flex-col gap-5"
      aria-live="polite"
      aria-atomic="false"
    >
      {messages.map((msg) =>
        msg.role === 'user' ? (
          <UserBubble key={msg.id} text={msg.text} />
        ) : (
          <AssistantBubble
            key={msg.id}
            text={msg.text}
            products={msg.products}
            fallback={msg.fallback}
            streaming={msg.id === streamingId}
            onAskFollowUp={onAskFollowUp}
          />
        ),
      )}
      {status === 'THINKING' && <ThinkingDots />}
    </div>
  );
}
