/**
 * `/chat` — pantalla del chat RAG (US-27, US-28, US-29, US-30, US-32).
 *
 * Server Component: trae el conteo de productos para renderear el header
 * ("Listo · X productos en tu base"). El thread vive en memoria del cliente
 * (spec §9.3), no persistimos historial de conversación.
 */
import { prisma } from '@/lib/db';
import { getHistorialCount } from '@/lib/products/count';
import { ChatPageClient } from './ChatPageClient';

export const metadata = {
  title: 'Chat · NutriLens',
};

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const [productsInBase, historialCount] = await Promise.all([
    prisma.product.count(),
    getHistorialCount(),
  ]);
  return <ChatPageClient productsInBase={productsInBase} historialCount={historialCount} />;
}
