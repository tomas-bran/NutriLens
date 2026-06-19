import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { getUserPrefs } from '@/lib/prefs/server';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized', reason: 'Iniciá sesión para continuar.' },
      { status: 401 },
    );
  }

  const mine = { analyses: { some: { userId: user.id } } };
  const [catalogoTotal, analizados, riesgoAlto, sinAlergenos, lastAnalysis, prefs] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: mine }),
      prisma.product.count({ where: { ...mine, riesgo: 'alto' } }),
      prisma.product.count({ where: { ...mine, alergenos: '[]' } }),
      prisma.productAnalysis.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { id: true, nombre: true, riesgo: true, createdAt: true } } },
      }),
      getUserPrefs(user.id),
    ]);

  return NextResponse.json({
    user,
    prefs,
    stats: {
      catalogoTotal,
      analizados,
      riesgoAlto,
      sinAlergenos,
      ultimoAnalizado: lastAnalysis
        ? {
            id: lastAnalysis.product.id,
            nombre: lastAnalysis.product.nombre,
            riesgo: lastAnalysis.product.riesgo,
            analyzedAt: lastAnalysis.createdAt.toISOString(),
          }
        : null,
    },
  });
}
