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
import { getHistorialCount } from '@/lib/products/count';
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

  const [historialCount, analizados, riesgoAlto, conAlergenos, initialPrefs] = await Promise.all([
    getHistorialCount(),
    prisma.product.count(),
    prisma.product.count({ where: { riesgo: 'alto' } }),
    // "sin alérgenos" = los que tienen el array vacío serializado como "[]".
    prisma.product.count({ where: { alergenos: '[]' } }),
    getUserPrefs(userId),
  ]);

  const user = {
    name: session.user.name ?? 'Mi cuenta',
    email: session.user.email ?? '',
    image: session.user.image ?? null,
  };
  const stats = { analizados, riesgoAlto, sinAlergenos: conAlergenos };

  return (
    <AppShell active="perfil" historialCount={historialCount}>
      <ProfileView user={user} stats={stats} initialPrefs={initialPrefs} />
    </AppShell>
  );
}
