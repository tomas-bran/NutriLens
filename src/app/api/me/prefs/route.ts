import { NextResponse, type NextRequest } from 'next/server';
import { requireUserId, Unauthorized } from '@/lib/auth/current-user';
import { DEFAULT_PREFS, getUserPrefs, saveUserPrefs, type DietPrefs } from '@/lib/prefs/server';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof Unauthorized) return unauthorized();
    throw err;
  }

  return NextResponse.json(await getUserPrefs(userId));
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof Unauthorized) return unauthorized();
    throw err;
  }

  let body: Partial<DietPrefs>;
  try {
    body = (await request.json()) as Partial<DietPrefs>;
  } catch {
    return NextResponse.json({ error: 'invalid_json', reason: 'Body inválido.' }, { status: 400 });
  }

  const current = await getUserPrefs(userId);
  const next: DietPrefs = {
    ...current,
    ...pickBooleanPrefs(body),
  };

  await saveUserPrefs(userId, next);
  return NextResponse.json(next);
}

function pickBooleanPrefs(body: Partial<DietPrefs>) {
  const next: Partial<DietPrefs> = {};
  (Object.keys(DEFAULT_PREFS) as Array<keyof DietPrefs>).forEach((key) => {
    if (typeof body[key] === 'boolean') next[key] = body[key];
  });
  return next;
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: 'unauthorized', reason: 'Iniciá sesión para continuar.' },
    { status: 401 },
  );
}
