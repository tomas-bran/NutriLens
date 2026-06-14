/**
 * GET /api/conversations/[id] — load conversation with messages.
 * PATCH /api/conversations/[id] — rename conversation.
 * DELETE /api/conversations/[id] — delete conversation and its messages.
 *
 * NL-302/NL-203: "Solo el dueño puede ver/renombrar/eliminar". El ownership
 * se verifica contra `session.user.id`: una conversación de otro usuario
 * devuelve 404 (no 403, para no filtrar su existencia).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId, Unauthorized } from '@/lib/auth/current-user';
import type { StoredMessage } from '@/lib/conversations/types';

function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: 'unauthorized', reason: 'Iniciá sesión para continuar.' },
    { status: 401 },
  );
}

function notFound(): NextResponse {
  return NextResponse.json(
    { error: 'not_found', reason: 'Conversación no encontrada.' },
    { status: 404 },
  );
}

/** Devuelve la conversación SOLO si pertenece al usuario; si no, null. */
async function ownedConversation(id: string, userId: string) {
  const row = await prisma.conversation.findUnique({ where: { id } });
  if (!row || row.userId !== userId) return null;
  return row;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof Unauthorized) return unauthorized();
    throw err;
  }
  const { id } = await params;
  const row = await ownedConversation(id, userId);
  if (!row) return notFound();

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
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof Unauthorized) return unauthorized();
    throw err;
  }
  const { id } = await params;
  let body: { title?: string; messages?: StoredMessage[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json', reason: 'Body inválido.' }, { status: 400 });
  }

  const existing = await ownedConversation(id, userId);
  if (!existing) return notFound();

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
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof Unauthorized) return unauthorized();
    throw err;
  }
  const { id } = await params;
  const existing = await ownedConversation(id, userId);
  if (!existing) return notFound();

  await prisma.conversation.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
