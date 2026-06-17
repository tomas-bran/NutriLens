/**
 * `/nutriworld` — experiencia 3D beta (NutriWorld). Solo admins: el resto cae
 * en notFound (y en el sidebar el item ya aparece disabled). Pantalla completa,
 * fuera del AppShell (la escena 3D quiere todo el viewport).
 */
import { notFound } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/auth/is-admin';
import { NutriWorldClient } from './NutriWorldClient';

export const metadata = { title: 'NutriWorld · NutriLens' };
export const dynamic = 'force-dynamic';

export default async function NutriWorldPage() {
  if (!(await isCurrentUserAdmin())) notFound();
  return <NutriWorldClient />;
}
