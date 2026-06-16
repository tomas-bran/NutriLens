/**
 * `/chat` — pantalla del chat RAG (US-27, US-28, US-29, US-30, US-32).
 *
 * NL-301: pre-carga la lista de conversaciones para mostrarlas en el empty state.
 */
import { AppShell } from '@/components/layout/AppShell';
import { prisma } from '@/lib/db';
import { getUserId } from '@/lib/auth/current-user';
import { getCatalogoCount } from '@/lib/products/count';
import type { ConversationSummary } from '@/lib/conversations/types';
import { ChatPageClient } from './ChatPageClient';

export const metadata = {
  title: 'Chat · NutriLens',
};

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  // NL-203: el empty state lista SOLO las conversaciones del usuario logueado.
  const userId = await getUserId();
  const [productsInBase, catalogoCount, convRows] = await Promise.all([
    prisma.product.count(),
    getCatalogoCount(),
    userId
      ? prisma.conversation.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        })
      : Promise.resolve([]),
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

  // AppShell se renderiza desde el server page (no desde ChatPageClient) para
  // que <SidebarUser> (async server component) no quede dentro de un árbol
  // cliente — eso causaba "uncached promise"/loop infinito.
  return (
    <AppShell active="chat" catalogoCount={catalogoCount}>
      <ChatPageClient productsInBase={productsInBase} initialConversations={initialConversations} />
    </AppShell>
  );
}
