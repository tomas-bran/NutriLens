'use server';

/**
 * Server Actions de auth (NL-201). Aisladas en su propio módulo `'use server'`
 * para poder pasarlas como `action={...}` desde cualquier componente sin caer
 * en "inline use server in client component".
 */
import { signIn, signOut } from '@/lib/auth';

export async function signInWithGoogle(redirectTo: string): Promise<void> {
  await signIn('google', { redirectTo });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
