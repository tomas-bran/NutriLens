/**
 * Helper de identidad para route handlers / server components (NL-202/203).
 * `requireUserId()` devuelve el id del usuario logueado o lanza `Unauthorized`
 * para que el caller responda 401. El middleware ya bloquea el acceso, pero
 * esto es la segunda línea (defensa en profundidad) y de paso tipa el id.
 */
import { auth } from '@/lib/auth';

/** Usuario fijo para el bypass de E2E (ver middleware). Nunca en deploy real. */
const E2E_USER_ID = 'e2e-test-user';
function e2eBypass(): boolean {
  // Igual que el middleware: flag explícito + nunca en Azure (WEBSITE_HOSTNAME).
  // No usamos NODE_ENV porque el E2E corre sobre `next build && next start`.
  return process.env.E2E_AUTH_BYPASS === 'true' && !process.env.WEBSITE_HOSTNAME;
}

export class Unauthorized extends Error {
  constructor() {
    super('unauthorized');
    this.name = 'Unauthorized';
  }
}

export async function getUserId(): Promise<string | null> {
  if (e2eBypass()) return E2E_USER_ID;
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Unauthorized();
  return id;
}
