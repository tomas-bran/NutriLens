/**
 * Client-side HTTP helpers for /api/conversations (NL-301/302).
 */
import type { ConversationSummary, ConversationDetail, StoredMessage } from './types';

export async function listConversations(): Promise<ConversationSummary[]> {
  const res = await fetch('/api/conversations');
  if (!res.ok) return [];
  return res.json() as Promise<ConversationSummary[]>;
}

export async function createConversation(
  messages: StoredMessage[],
): Promise<{ id: string; title: string } | null> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; title: string }>;
}

export async function getConversation(id: string): Promise<ConversationDetail | null> {
  const res = await fetch(`/api/conversations/${id}`);
  if (!res.ok) return null;
  return res.json() as Promise<ConversationDetail>;
}

export async function updateConversation(
  id: string,
  data: { title?: string; messages?: StoredMessage[] },
): Promise<{ id: string; title: string } | null> {
  const res = await fetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; title: string }>;
}

export async function deleteConversation(id: string): Promise<boolean> {
  const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
  return res.status === 204;
}
