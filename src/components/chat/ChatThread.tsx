/**
 * <ChatThread> — lista vertical de mensajes + indicador de "pensando" cuando
 * el estado es THINKING. Auto-scroll al último mensaje cuando llega uno nuevo.
 *
 * No persistimos el thread en DB (spec §9.3). El page lo mantiene en memoria.
 */
'use client';

import { useEffect, useRef } from 'react';
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
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, status]);

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
            onAskFollowUp={onAskFollowUp}
          />
        ),
      )}
      {status === 'THINKING' && <ThinkingDots />}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
