'use server';

/**
 * Server action para guardar las preferencias del usuario logueado (NL-208).
 */
import { requireUserId } from '@/lib/auth/current-user';
import { saveUserPrefs, type DietPrefs } from '@/lib/prefs/server';

export async function saveMyPrefs(prefs: DietPrefs): Promise<void> {
  const userId = await requireUserId();
  await saveUserPrefs(userId, prefs);
}
