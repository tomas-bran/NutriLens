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
  // Bypass de E2E: el usuario de test ES admin para poder ejercitar las vistas
  // técnicas (JSON + pipeline trace, US-33/34) en los E2E. Nunca aplica en un
  // deploy real (gate por WEBSITE_HOSTNAME, igual que el bypass de auth).
  if (process.env.E2E_AUTH_BYPASS === 'true' && !process.env.WEBSITE_HOSTNAME) return true;
  if ((await getUserId()) === null) return false;
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}
