/**
 * `/nutriworld` — experiencia 3D beta (NutriWorld). Solo admins whitelisteados:
 * el resto cae en notFound y NO ve el item en el sidebar (no aparece). Pantalla
 * completa, fuera del AppShell (la escena 3D quiere todo el viewport).
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
