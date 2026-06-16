/**
 * Generación del título de una conversación resumiendo el chat con IA.
 *
 * NL-302 (rediseño): en vez del heurístico que truncaba el primer mensaje del
 * usuario, pedimos al `IaProvider` un título corto que resuma el TEMA de la
 * conversación. Se hace **una sola vez**, al crear la conversación (POST
 * /api/conversations), y nunca se regenera — los updates posteriores solo tocan
 * los mensajes, y el rename manual del usuario lo pisa explícitamente.
 *
 * Es best-effort: si la IA falla, devuelve timeout o un título vacío/inválido,
 * caemos al heurístico `generateTitle()` sobre el primer mensaje del usuario.
 */
import type { IaProvider } from '@/lib/ai/types';
import { logger } from '@/lib/logger';
import { generateTitle, type StoredMessage } from './types';

export const TITLE_PROMPT_VERSION = 'chat_title-v1' as const;

const MAX_TITLE_LEN = 60;
/** Primeras N intervenciones — alcanza para titular sin inflar tokens. */
const TRANSCRIPT_MAX_MESSAGES = 6;
const TRANSCRIPT_MAX_CHARS = 1500;
const TITLE_TIMEOUT_MS = 8000;

/** Arma un transcript compacto "Usuario: …\nNutriLens: …" para resumir. */
export function buildTranscript(messages: StoredMessage[]): string {
  return messages
    .slice(0, TRANSCRIPT_MAX_MESSAGES)
    .map((m) => {
      const who = m.role === 'user' ? 'Usuario' : 'NutriLens';
      return `${who}: ${m.text.replace(/\s+/g, ' ').trim()}`;
    })
    .join('\n')
    .slice(0, TRANSCRIPT_MAX_CHARS)
    .trim();
}

/** Limpia la salida del modelo para usarla como título de una línea. */
export function sanitizeTitle(raw: string): string {
  // Primera línea no vacía (antes de colapsar \n), por si el modelo agrega
  // una explicación debajo del título.
  const firstLine =
    raw
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? '';
  let t = firstLine.replace(/\s+/g, ' ').trim();
  // quitar prefijos tipo "Título:" y comillas/punto envolventes
  t = t.replace(/^t[ií]tulo\s*:\s*/i, '').trim();
  t = t.replace(/^["'“”«»]+|["'“”«».]+$/g, '').trim();
  if (t.length > MAX_TITLE_LEN) {
    const cut = t.slice(0, MAX_TITLE_LEN);
    const lastSpace = cut.lastIndexOf(' ');
    t = (lastSpace > 30 ? cut.slice(0, lastSpace) : cut) + '…';
  }
  return t;
}

export interface GenerateConversationTitleDeps {
  ia: IaProvider;
}

export async function generateConversationTitle(
  messages: StoredMessage[],
  { ia }: GenerateConversationTitleDeps,
): Promise<string> {
  const firstUser = messages.find((m) => m.role === 'user');
  const fallback = firstUser ? generateTitle(firstUser.text) : 'Nueva conversación';

  const transcript = buildTranscript(messages);
  if (!transcript) return fallback;

  try {
    const { raw } = await ia.answerWithContext(transcript, [], {
      promptVersion: TITLE_PROMPT_VERSION,
      timeoutMs: TITLE_TIMEOUT_MS,
    });
    const title = sanitizeTitle(raw);
    return title || fallback;
  } catch (err) {
    logger.warn('conversation.title_ia_failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}
