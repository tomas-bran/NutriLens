/**
 * GET /api/conversations — list conversations ordered by last activity.
 * POST /api/conversations — create a new conversation with first message.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { generateTitle, type StoredMessage } from '@/lib/conversations/types';

export async function GET(): Promise<NextResponse> {
  const rows = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  const summaries = rows.map((r) => {
    let messages: StoredMessage[] = [];
    try {
      messages = JSON.parse(r.messages) as StoredMessage[];
    } catch {}
    const lastMsg = messages.at(-1);
    return {
      id: r.id,
      title: r.title,
      messageCount: messages.length,
      lastMessage: lastMsg?.text.slice(0, 100) ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  return NextResponse.json(summaries);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { messages: StoredMessage[] };
  try {
    body = (await request.json()) as { messages: StoredMessage[] };
  } catch {
    return NextResponse.json({ error: 'invalid_json', reason: 'Body inválido.' }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: 'invalid_query', reason: 'messages requerido.' },
      { status: 400 },
    );
  }

  const firstUser = messages.find((m) => m.role === 'user');
  const title = firstUser ? generateTitle(firstUser.text) : 'Nueva conversación';

  const conv = await prisma.conversation.create({
    data: {
      title,
      messages: JSON.stringify(messages),
    },
  });

  return NextResponse.json({ id: conv.id, title: conv.title }, { status: 201 });
}
