/**
 * Rol admin (NL-204). Por ahora es una allowlist de emails (ADMIN_EMAILS,
 * coma-separado; default: federicoamartucci@gmail.com). A futuro: rol en DB
 * + dashboard (NL-205/206/207). Las vistas técnicas (JSON + pipeline trace)
 * y, más adelante, las capacidades de administración, se gatean con esto.
 */
import { getUserId } from '@/lib/auth/current-user';
import { auth } from '@/lib/auth';

const DEFAULT_ADMINS = ['federicoamartucci@gmail.com'];

export function adminEmails(): string[] {
  const fromEnv = process.env.ADMIN_EMAILS;
  const list = fromEnv ? fromEnv.split(',') : DEFAULT_ADMINS;
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/** True si la sesión actual es admin. Server-side. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  // Bypass de E2E: el usuario de test NO es admin (la UI limpia es el default).
  if ((await getUserId()) === null) return false;
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}
