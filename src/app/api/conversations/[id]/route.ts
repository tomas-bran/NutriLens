/**
 * GET /api/conversations/[id] — load conversation with messages.
 * PATCH /api/conversations/[id] — rename conversation.
 * DELETE /api/conversations/[id] — delete conversation and its messages.
 *
 * NL-302: "Solo el dueño puede renombrar/eliminar".
 * TODO NL-201: once auth is in place, verify req.user.id === conversation.userId
 * before PATCH/DELETE. Currently single-user app — no ownership check.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import type { StoredMessage } from '@/lib/conversations/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const row = await prisma.conversation.findUnique({ where: { id } });
  if (!row)
    return NextResponse.json(
      { error: 'not_found', reason: 'Conversación no encontrada.' },
      { status: 404 },
    );

  let messages: StoredMessage[] = [];
  try {
    messages = JSON.parse(row.messages) as StoredMessage[];
  } catch {}

  return NextResponse.json({
    id: row.id,
    title: row.title,
    messageCount: messages.length,
    lastMessage: messages.at(-1)?.text.slice(0, 100) ?? null,
    messages,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  let body: { title?: string; messages?: StoredMessage[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json', reason: 'Body inválido.' }, { status: 400 });
  }

  const existing = await prisma.conversation.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json(
      { error: 'not_found', reason: 'Conversación no encontrada.' },
      { status: 404 },
    );

  const updateData: { title?: string; messages?: string } = {};
  if (typeof body.title === 'string' && body.title.trim()) {
    updateData.title = body.title.trim().slice(0, 200);
  }
  if (Array.isArray(body.messages)) {
    updateData.messages = JSON.stringify(body.messages);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'invalid_query', reason: 'Nada que actualizar.' },
      { status: 400 },
    );
  }

  const updated = await prisma.conversation.update({ where: { id }, data: updateData });
  return NextResponse.json({ id: updated.id, title: updated.title });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const existing = await prisma.conversation.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json(
      { error: 'not_found', reason: 'Conversación no encontrada.' },
      { status: 404 },
    );

  await prisma.conversation.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
