export interface MobileAuthUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

interface MobileTokenPayload extends MobileAuthUser {
  exp: number;
}

const encoder = new TextEncoder();

export async function signMobileToken(user: MobileAuthUser, ttlSeconds = 60 * 60 * 24 * 30) {
  const payload: MobileTokenPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(body, getSecret());
  return `${body}.${signature}`;
}

export async function verifyMobileToken(
  token: string | null | undefined,
): Promise<MobileAuthUser | null> {
  if (!token) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = await sign(body, getSecret());
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as MobileTokenPayload;
    if (!payload.id || !payload.email || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name || payload.email,
      image: payload.image || null,
    };
  } catch {
    return null;
  }
}

export async function getMobileUserFromAuthorization(authorization: string | null | undefined) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return verifyMobileToken(match?.[1]);
}

function getSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'local-dev-secret';
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function base64UrlEncode(value: string) {
  return base64UrlEncodeBytes(encoder.encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return atob(padded);
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
