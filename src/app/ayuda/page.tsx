/**
 * `/ayuda` — FAQ + contacto (rediseño). Copy sin tecnicismos. Protegida por
 * el middleware.
 */
import { AppShell } from '@/components/layout/AppShell';
import { HelpView } from '@/components/profile/HelpView';
import { getHistorialCount } from '@/lib/products/count';

export const metadata = { title: 'Ayuda · NutriLens' };
export const dynamic = 'force-dynamic';

export default async function AyudaPage() {
  const historialCount = await getHistorialCount();
  return (
    <AppShell active="perfil" historialCount={historialCount}>
      <HelpView />
    </AppShell>
  );
}
