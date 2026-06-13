/**
 * Tipos para el historial de chats persistente (NL-301/302).
 */
import type { ChatProductRef } from '@/lib/chat/response';
import type { ChatFallback } from '@/lib/chat/empty-response';

export interface StoredMessage {
  role: 'user' | 'assistant';
  text: string;
  /** Only present on assistant messages */
  products?: ChatProductRef[];
  fallback?: ChatFallback | null;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: StoredMessage[];
}

export function generateTitle(firstUserMessage: string): string {
  const clean = firstUserMessage.trim().replace(/\s+/g, ' ');
  if (clean.length <= 60) return clean;
  const truncated = clean.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 30 ? truncated.slice(0, lastSpace) : truncated) + '…';
}
