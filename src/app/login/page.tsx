/**
 * `/login` — inicio de sesión con Google (NL-201, rediseño Claude Design).
 *
 * Layout partido: panel de marca a la izquierda (gradiente + beneficios) y la
 * card de Google a la derecha. En mobile el panel de marca pasa a una franja
 * superior compacta. Server component; el botón es un `<form>` con server
 * action `signInWithGoogle`. El middleware redirige acá a los no-logueados.
 */
import { LoginDecor } from '@/components/auth/LoginDecor';
import { NutriMark } from '@/components/ui/NutriMark';
import { signInWithGoogle } from '@/lib/auth/actions';

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export const metadata = { title: 'Ingresar · NutriLens' };

const PERKS = [
  { title: 'Análisis instantáneo', desc: 'Foto o PDF de la etiqueta, con resultado en segundos.' },
  { title: 'Tu catálogo sincronizado', desc: 'Cada análisis queda guardado en tu cuenta.' },
  { title: 'Chat sobre tus productos', desc: 'Preguntá y compará lo que ya escaneaste.' },
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;
  const redirectTo = safeRedirect(callbackUrl);

  return (
    <main className="flex min-h-[100dvh] bg-[var(--color-bg)] md:items-stretch">
      {/* Panel de marca — franja superior en mobile, columna en desktop */}
      <aside className="home-gradient relative hidden flex-col justify-between overflow-hidden p-11 text-white md:flex md:w-[46%]">
        <LoginDecor />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white/20 backdrop-blur">
            <NutriMark size={24} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">NutriLens</span>
        </div>

        <div className="relative">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[1.5px] backdrop-blur">
            Entendé qué comés
          </span>
          <h2 className="mb-7 max-w-[26rem] text-[34px] font-extrabold leading-[1.08] tracking-tight">
            Analizá cualquier etiqueta y{' '}
            <span className="text-[var(--color-accent-lime)]">guardá todo</span> en tu cuenta.
          </h2>
          <ul className="grid max-w-sm gap-4">
            {PERKS.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                  <CheckGlyph />
                </span>
                <div>
                  <div className="text-[14.5px] font-bold">{p.title}</div>
                  <div className="mt-0.5 text-[13px] leading-snug text-white/80">{p.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/65">© 2026 NutriLens®</p>
      </aside>

      {/* Card de acceso */}
      <section className="flex flex-1 flex-col items-center px-6 py-12 md:px-10">
        <div className="home-rise-in flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6">
          <span className="home-gradient flex h-[60px] w-[60px] items-center justify-center rounded-[18px] text-white shadow-[0_10px_26px_rgba(22,163,74,0.35)] md:hidden">
            <NutriMark size={34} />
          </span>

          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
              Entrá a NutriLens
            </h1>
            <p className="max-w-[19rem] text-sm leading-relaxed text-[var(--color-text-muted)]">
              Iniciá sesión con Google para analizar etiquetas y guardar tus consultas.
            </p>
          </div>

          <form action={signInWithGoogle.bind(null, redirectTo)} className="w-full">
            <button
              type="submit"
              data-testid="google-signin"
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-5 py-4 text-[15px] font-bold text-[var(--color-text)] shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
            >
              <GoogleGlyph />
              Continuar con Google
            </button>
          </form>

          <div className="flex w-full items-center gap-3 text-[var(--color-text-muted)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="text-[11.5px] font-semibold">acceso seguro y privado</span>
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          <p className="max-w-[20rem] text-center text-[11.5px] leading-relaxed text-[var(--color-text-muted)]">
            Al continuar aceptás los{' '}
            <b className="font-semibold text-[var(--color-text)]">Términos</b> y la{' '}
            <b className="font-semibold text-[var(--color-text)]">Política de privacidad</b>.
          </p>
        </div>

        {/* Disclaimer como footer, desligado de Términos/Privacidad. */}
        <footer className="mt-10 max-w-sm text-center text-[11px] leading-relaxed text-[var(--color-text-muted)]">
          NutriLens es un asistente informativo: no reemplaza el consejo de un profesional de la
          salud ni la lectura del etiquetado oficial del producto.
        </footer>
      </section>
    </main>
  );
}

/** Solo permitimos redirects internos (evita open-redirect vía callbackUrl). */
function safeRedirect(raw: string | undefined): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/';
}

function CheckGlyph() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
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
