/**
 * POST /api/chat — endpoint del chat RAG sobre el historial.
 *
 * Pipeline (delegado a `handleChat`, ver `src/lib/chat/handle-chat.ts`):
 *   parse_intent (Phi-mini) → retrieve_products (SQL) →
 *   (generate_answer (Phi-mini)  |  empty_response  |  unknown_response)
 *
 * Cubre: US-27 (interfaz consumidora), US-28 (retrieval), US-29 (generación
 * con contexto), US-30 (caso sin contexto), US-32 (chips de productos).
 * Spec: `docs/specs/E05-chat-rag.md §3`.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { ApiError } from '@schemas/errors';
import { getIaProvider } from '@/lib/ai';
import { getUserId } from '@/lib/auth/current-user';
import { apiErrorResponse } from '@/lib/api/error-response';
import { handleChat } from '@/lib/chat/handle-chat';
import { describePrefs, getUserPrefs } from '@/lib/prefs/server';
import { toChatProductRef, type ChatApiResponse } from '@/lib/chat/response';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = pickRequestId(request.headers.get('x-request-id'));

  try {
    const body = await readBody(request);
    const question =
      typeof body === 'object' && body !== null && 'question' in body
        ? (body as { question: unknown }).question
        : undefined;

    // NL-208: resolvemos las prefs del usuario acá (transport) y se las
    // pasamos al orquestador, que queda libre de imports de auth.
    const userId = await getUserId();
    const userPrefs = userId ? describePrefs(await getUserPrefs(userId)) : '';

    const result = await handleChat(question as string, {
      ia: getIaProvider(),
      requestId,
      userPrefs,
    });

    const payload: ChatApiResponse = {
      answer: result.answer,
      products: result.products.map(toChatProductRef),
      intent: result.intent,
      tokensUsed: result.tokensUsed,
      fallback: result.fallback,
      suggestions: result.suggestions,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: { 'X-Request-Id': requestId },
    });
  } catch (err) {
    return apiErrorResponse(err, requestId);
  }
}

async function readBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(
      'invalid_question',
      'Body inválido: enviá un JSON con el campo `question`.',
      400,
    );
  }
}

function pickRequestId(header: string | null): string {
  if (header && UUID_RE.test(header)) return header.toLowerCase();
  return randomUUID();
}
