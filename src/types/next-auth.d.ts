/** Augmenta el tipo de sesión de Auth.js con el id estable del usuario (NL-201). */
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
