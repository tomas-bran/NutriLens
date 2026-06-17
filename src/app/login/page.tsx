/**
 * `/login` — pantalla de inicio de sesión con Google (NL-201).
 *
 * Server component: el botón es un `<form>` con server action que invoca
 * `signIn('google', { redirectTo })`. Sin JS de cliente. El middleware ya
 * redirige acá a los no-logueados y de vuelta al destino vía `callbackUrl`.
 */
import { Icon } from '@/components/ui/Icon';
import { signInWithGoogle } from '@/lib/auth/actions';

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export const metadata = { title: 'Ingresar · NutriLens' };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;
  const redirectTo = safeRedirect(callbackUrl);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="home-rise-in flex w-full max-w-sm flex-col items-center gap-6 rounded-[28px] border border-[var(--color-border)] bg-white p-8 shadow-[0_20px_60px_-24px_rgba(22,163,74,0.4)]">
        <div className="home-gradient flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-[0_8px_24px_rgba(22,163,74,0.35)]">
          <Icon name="scan-eye" className="h-8 w-8" />
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">NutriLens</h1>
          <p className="max-w-[18rem] text-sm text-[var(--color-text-muted)]">
            Entrá con tu cuenta de Google para analizar etiquetas y guardar tus consultas.
          </p>
        </div>

        <form action={signInWithGoogle.bind(null, redirectTo)} className="w-full">
          <button
            type="submit"
            data-testid="google-signin"
            className="flex w-full items-center justify-center gap-3 rounded-full border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            <GoogleGlyph />
            Continuar con Google
          </button>
        </form>

        <p className="text-center text-[11px] text-[var(--color-text-muted)]">
          NutriLens es un asistente informativo. No reemplaza el consejo de un profesional de la
          salud.
        </p>
      </div>
    </main>
  );
}

/** Solo permitimos redirects internos (evita open-redirect vía callbackUrl). */
function safeRedirect(raw: string | undefined): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/';
}

function GoogleGlyph() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
