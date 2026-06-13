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
}

export function ChatThread({ messages, status }: ChatThreadProps) {
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
          />
        ),
      )}
      {status === 'THINKING' && <ThinkingDots />}
    </div>
  );
}
