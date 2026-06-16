/**
 * `/` — Home (US-07, spec `docs/specs/E01-onboarding-y-upload.md §8`).
 *
 * Server Component: counts persisted products via the shared
 * `getCatalogoCount()` helper so the page + the AppShell sidebar share a
 * single roundtrip (React.cache dedupes per-request).
 */
import { HomeView } from '@/components/home/HomeView';
import { auth } from '@/lib/auth';
import { getCatalogoCount } from '@/lib/products/count';

// History count depends on persisted state; opting out of static rendering
// avoids serving a stale "0 productos" card on prod after a successful upload.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Google no expone género de forma confiable; saludamos con el nombre (neutro)
  // en vez de elegir Bienvenido/a/x. El primer nombre alcanza para personalizar.
  const [historyCount, session] = await Promise.all([getCatalogoCount(), auth()]);
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? null;
  return <HomeView historyCount={historyCount} userName={firstName} />;
}
