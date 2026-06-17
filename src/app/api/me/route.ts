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

  const [analizados, riesgoAlto, sinAlergenos, prefs] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { riesgo: 'alto' } }),
    prisma.product.count({ where: { alergenos: '[]' } }),
    getUserPrefs(user.id),
  ]);

  return NextResponse.json({
    user,
    prefs,
    stats: { analizados, riesgoAlto, sinAlergenos },
  });
}
