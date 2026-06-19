/**
 * Helper de identidad para route handlers / server components (NL-202/203).
 * `requireUserId()` devuelve el id del usuario logueado o lanza `Unauthorized`
 * para que el caller responda 401. El middleware ya bloquea el acceso, pero
 * esto es la segunda línea (defensa en profundidad) y de paso tipa el id.
 */
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getMobileUserFromAuthorization, type MobileAuthUser } from '@/lib/auth/mobile-token';

/** Usuario fijo para el bypass de E2E (ver middleware). */
const E2E_USER_ID = 'e2e-test-user';
// Se activa con el flag explícito `E2E_AUTH_BYPASS` y NUNCA en un deploy real:
// `WEBSITE_HOSTNAME` lo setea siempre Azure App Service, así que aunque el flag
// se filtrara a las App Settings de prod, el bypass queda desactivado. (No
// usamos NODE_ENV porque el webServer de E2E corre un build de prod `next
// start` → NODE_ENV=production, y eso desactivaba el bypass → E2E roto.)
function e2eBypass(): boolean {
  return process.env.E2E_AUTH_BYPASS === 'true' && !process.env.WEBSITE_HOSTNAME;
}

export class Unauthorized extends Error {
  constructor() {
    super('unauthorized');
    this.name = 'Unauthorized';
  }
}

export async function getCurrentUser(): Promise<MobileAuthUser | null> {
  if (e2eBypass()) {
    return {
      id: E2E_USER_ID,
      email: 'e2e@nutrilens.local',
      name: 'Usuario E2E',
      image: null,
    };
  }
  const mobileUser = await getMobileUserFromAuthorization(await getAuthorizationHeader());
  if (mobileUser) return mobileUser;

  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: session.user.name ?? 'Mi cuenta',
    image: session.user.image ?? null,
  };
}

async function getAuthorizationHeader(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get('authorization');
  } catch {
    return null;
  }
}

export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Unauthorized();
  return id;
}
