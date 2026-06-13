/**
 * Preferencias de dieta por usuario (NL-208). Persistidas en `UserPrefs`
 * (keyed por Google sub). Alimentan el perfil y el contexto del chat.
 */
import { prisma } from '@/lib/db';

export interface DietPrefs {
  vegano: boolean;
  celiaco: boolean;
  lactosa: boolean;
  avisos: boolean;
}

export const DEFAULT_PREFS: DietPrefs = {
  vegano: false,
  celiaco: false,
  lactosa: false,
  avisos: true,
};

export async function getUserPrefs(userId: string): Promise<DietPrefs> {
  const row = await prisma.userPrefs.findUnique({ where: { userId } });
  if (!row) return { ...DEFAULT_PREFS };
  return { vegano: row.vegano, celiaco: row.celiaco, lactosa: row.lactosa, avisos: row.avisos };
}

export async function saveUserPrefs(userId: string, prefs: DietPrefs): Promise<void> {
  await prisma.userPrefs.upsert({
    where: { userId },
    create: { userId, ...prefs },
    update: { ...prefs },
  });
}

/**
 * Resumen en lenguaje natural de las preferencias activas, para inyectar como
 * contexto al chat. Vacío si no hay ninguna declarada (no ensucia el prompt).
 */
export function describePrefs(prefs: DietPrefs): string {
  const active: string[] = [];
  if (prefs.vegano) active.push('sigue una dieta vegana (evita ingredientes de origen animal)');
  if (prefs.celiaco) active.push('es celíaco (evita gluten)');
  if (prefs.lactosa) active.push('evita la lactosa');
  if (active.length === 0) return '';
  return `El usuario ${active.join(', ')}. Priorizá avisarle si algún producto no es compatible con esto.`;
}
