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
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
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
