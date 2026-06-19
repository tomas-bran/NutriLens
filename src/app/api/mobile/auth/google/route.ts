import { NextResponse, type NextRequest } from 'next/server';
import { signMobileToken } from '@/lib/auth/mobile-token';

export const runtime = 'nodejs';

interface GoogleTokenInfo {
  sub?: string;
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { idToken?: string };
  try {
    body = (await request.json()) as { idToken?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json', reason: 'Body inválido.' }, { status: 400 });
  }

  if (!body.idToken) {
    return NextResponse.json(
      { error: 'invalid_token', reason: 'Falta el token de Google.' },
      { status: 400 },
    );
  }

  let tokenInfo: GoogleTokenInfo;
  try {
    tokenInfo = await verifyGoogleIdToken(body.idToken);
  } catch {
    return NextResponse.json(
      { error: 'invalid_token', reason: 'No pudimos validar la sesión de Google.' },
      { status: 401 },
    );
  }
  if (!tokenInfo.sub || !tokenInfo.email) {
    return NextResponse.json(
      { error: 'invalid_token', reason: 'Google no devolvió una identidad válida.' },
      { status: 401 },
    );
  }

  const allowedAudiences = getAllowedAudiences();
  if (
    allowedAudiences.length > 0 &&
    (!tokenInfo.aud || !allowedAudiences.includes(tokenInfo.aud))
  ) {
    return NextResponse.json(
      {
        error: 'invalid_audience',
        reason: 'El cliente Google de la app mobile no está permitido.',
      },
      { status: 401 },
    );
  }

  const emailVerified =
    tokenInfo.email_verified === true || String(tokenInfo.email_verified).toLowerCase() === 'true';
  if (!emailVerified) {
    return NextResponse.json(
      { error: 'email_not_verified', reason: 'La cuenta de Google no tiene email verificado.' },
      { status: 401 },
    );
  }

  const user = {
    id: tokenInfo.sub,
    email: tokenInfo.email,
    name: tokenInfo.name || tokenInfo.email,
    image: tokenInfo.picture || null,
  };

  const token = await signMobileToken(user);
  return NextResponse.json({ token, user });
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error('Google token verification failed');
  }

  return (await response.json()) as GoogleTokenInfo;
}

function getAllowedAudiences() {
  return [
    process.env.MOBILE_GOOGLE_CLIENT_IDS,
    process.env.AUTH_GOOGLE_ID,
    process.env.GOOGLE_CLIENT_ID,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}
