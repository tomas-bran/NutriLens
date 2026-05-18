/**
 * Serialización del response del endpoint `POST /api/chat`. Reusa los enums
 * canónicos del producto (`Categoria`, `Riesgo`) y devuelve un shape compacto
 * — el chip de la UI solo necesita {id, nombre, riesgo, imagenUrl, categoria}.
 *
 * Spec: `docs/specs/E05-chat-rag.md §3.2`.
 */
import type { Product as PrismaProduct } from '@prisma/client';
import type { Categoria, Riesgo } from '@schemas/product';
import { mapCategoriaFromPrisma } from '@/lib/products/serializers';
import type { ChatIntent } from '@/lib/chat/intent-schema';
import type { ChatFallback } from '@/lib/chat/empty-response';

export interface ChatProductRef {
  id: string;
  nombre: string;
  categoria: Categoria;
  riesgo: Riesgo;
  imagenUrl: string;
}

export interface ChatApiResponse {
  answer: string;
  products: ChatProductRef[];
  intent: ChatIntent;
  tokensUsed: { in: number; out: number };
  fallback: ChatFallback | null;
}

export function toChatProductRef(p: PrismaProduct): ChatProductRef {
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: mapCategoriaFromPrisma(p.categoria),
    riesgo: p.riesgo as Riesgo,
    imagenUrl: p.imagenPath,
  };
}
