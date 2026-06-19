/**
 * `/mi-cuenta` — perfil del usuario (NL-201, rediseño). Resuelve la sesión y
 * las stats de la base, y delega en <ProfileView> (client). Protegida por el
 * middleware; si no hay sesión, no se llega acá.
 */
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ProfileView } from '@/components/profile/ProfileView';
import { auth } from '@/lib/auth';
import { getUserId } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { getCatalogoCount } from '@/lib/products/count';
import { getUserPrefs } from '@/lib/prefs/server';

export const metadata = { title: 'Mi cuenta · NutriLens' };
export const dynamic = 'force-dynamic';

export default async function MiCuentaPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/mi-cuenta');

  // Las prefs se leen con el MISMO id que usa `saveMyPrefs` (getUserId, que
  // respeta el bypass de E2E). Si leyéramos por session.user.id, bajo el bypass
  // local el id de lectura y escritura divergen y las prefs "no persisten".
  const userId = (await getUserId()) ?? session.user.id;

  // Las stats del perfil son PER-USUARIO: cuentan lo que ESTE usuario analizó
  // (vínculo ProductAnalysis), no el catálogo compartido entero. Mismo criterio
  // que el filtro "Analizados por vos". Con solo el seed (sin vínculos) → 0.
  // Solo productos NO borrados (soft delete): si un admin elimina un producto
  // que este usuario analizó, deja de contar acá (y desaparece del catálogo).
  const mine = { analyses: { some: { userId } }, deletedAt: null };
  const [catalogoCount, analizados, riesgoAlto, conAlergenos, initialPrefs] = await Promise.all([
    getCatalogoCount(),
    prisma.product.count({ where: mine }),
    prisma.product.count({ where: { ...mine, riesgo: 'alto' } }),
    // "sin alérgenos" = los que tienen el array vacío serializado como "[]".
    prisma.product.count({ where: { ...mine, alergenos: '[]' } }),
    getUserPrefs(userId),
  ]);

  const user = {
    name: session.user.name ?? 'Mi cuenta',
    email: session.user.email ?? '',
    image: session.user.image ?? null,
  };
  const stats = { analizados, riesgoAlto, sinAlergenos: conAlergenos };

  return (
    <AppShell active="perfil" catalogoCount={catalogoCount}>
      <ProfileView user={user} stats={stats} initialPrefs={initialPrefs} />
    </AppShell>
  );
}
