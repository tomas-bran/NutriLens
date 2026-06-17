/**
 * Tipos client del chat. Vive aparte de los schemas/back para que los
 * componentes presentacionales no acoplen al transport (Prisma/Zod).
 *
 * Visual reference: Pencil `EZWne` (M11 idle), `nuBfw` (M12 con respuesta),
 * `qoTng` (D05 desktop).
 */
import type { ChatProductRef } from '@/lib/chat/response';
import type { ChatFallback } from '@/lib/chat/empty-response';

export type ChatStatus = 'IDLE' | 'THINKING' | 'STREAMING' | 'ERROR';

export type ChatMessage =
  | { role: 'user'; id: string; text: string }
  | {
      role: 'assistant';
      id: string;
      text: string;
      products: ChatProductRef[];
      fallback: ChatFallback | null;
    };

/** Para hidratar el ChatInput cuando el usuario reintenta el último envío. */
export const RETRY_HINT = 'retry';

export const CHAT_SUGGESTIONS: readonly string[] = [
  'Mostrame productos aptos para celíacos',
  'Dame galletitas con menor riesgo',
  '¿Qué productos contienen leche?',
  'Comparame Choco Crunch vs. Cereales',
];
