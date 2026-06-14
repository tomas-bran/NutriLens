/**
 * Helper de identidad para route handlers / server components (NL-202/203).
 * `requireUserId()` devuelve el id del usuario logueado o lanza `Unauthorized`
 * para que el caller responda 401. El middleware ya bloquea el acceso, pero
 * esto es la segunda línea (defensa en profundidad) y de paso tipa el id.
 */
import { auth } from '@/lib/auth';

/** Usuario fijo para el bypass de E2E (ver middleware). */
const E2E_USER_ID = 'e2e-test-user';
// Se gatea SOLO con el flag explícito `E2E_AUTH_BYPASS`, que la config de
// Playwright setea y que NUNCA debe estar en las App Settings de prod. (Antes
// exigía además `NODE_ENV !== 'production'`, pero el webServer de E2E corre un
// build de producción (`next start`), así que ese guard desactivaba el bypass
// y todas las rutas protegidas redirigían a /login → E2E roto.)
function e2eBypass(): boolean {
  return process.env.E2E_AUTH_BYPASS === 'true';
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
