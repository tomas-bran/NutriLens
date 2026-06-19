/**
 * Configuración de Auth.js v5 (NextAuth) — login con Google (NL-201).
 *
 * Estrategia JWT (sin DB adapter): no guardamos usuarios en una tabla propia.
 * La identidad estable es el `sub` de Google, que propagamos a la sesión como
 * `session.user.id` y usamos como `Conversation.userId` (NL-203). Esto evita
 * una tabla User/Account/Session extra para el MVP; si más adelante hace falta
 * (multi-provider, perfiles), se suma el PrismaAdapter sin tocar el resto.
 *
 * Env requeridas (ver .env.example): AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET,
 * AUTH_SECRET. En prod además AUTH_URL + AUTH_TRUST_HOST=true (App Service
 * detrás de proxy).
 */
import NextAuth from 'next-auth';
import type { Session } from 'next-auth';
import Google from 'next-auth/providers/google';

const E2E_SESSION: Session = {
  user: {
    id: 'e2e-test-user',
    email: 'e2e@nutrilens.local',
    name: 'Usuario E2E',
    image: null,
  },
  expires: '2099-12-31T23:59:59.999Z',
};

function e2eBypass(): boolean {
  return process.env.E2E_AUTH_BYPASS === 'true' && !process.env.WEBSITE_HOSTNAME;
}

const nextAuth = NextAuth({
  providers: [Google],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // El `sub` (id de Google) viaja en el JWT y de ahí a la sesión.
    jwt({ token, profile }) {
      if (profile?.sub) token.sub = profile.sub;
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
});

const rawAuth = nextAuth.auth;

export const { handlers, signIn, signOut } = nextAuth;

type AuthWithServerSession = typeof rawAuth & (() => Promise<Session | null>);

export const auth = ((...args: unknown[]) => {
  if (args.length === 0 && e2eBypass()) {
    return Promise.resolve(E2E_SESSION);
  }

  return (rawAuth as (...rawArgs: unknown[]) => unknown)(...args);
}) as AuthWithServerSession;
