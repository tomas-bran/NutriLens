/**
 * `/chat` — pantalla del chat RAG (US-27, US-28, US-29, US-30, US-32).
 *
 * NL-301: pre-carga la lista de conversaciones para mostrarlas en el empty state.
 */
import { prisma } from '@/lib/db';
import { getHistorialCount } from '@/lib/products/count';
import type { ConversationSummary } from '@/lib/conversations/types';
import { ChatPageClient } from './ChatPageClient';

export const metadata = {
  title: 'Chat · NutriLens',
};

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const [productsInBase, historialCount, convRows] = await Promise.all([
    prisma.product.count(),
    getHistorialCount(),
    prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
  ]);

  const initialConversations: ConversationSummary[] = convRows.map((r) => {
    let messageCount = 0;
    let lastMessage: string | null = null;
    try {
      const msgs = JSON.parse(r.messages) as Array<{ role: string; text: string }>;
      messageCount = msgs.length;
      lastMessage = msgs.at(-1)?.text.slice(0, 100) ?? null;
    } catch {}
    return {
      id: r.id,
      title: r.title,
      messageCount,
      lastMessage,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  return (
    <ChatPageClient
      productsInBase={productsInBase}
      historialCount={historialCount}
      initialConversations={initialConversations}
    />
  );
}
