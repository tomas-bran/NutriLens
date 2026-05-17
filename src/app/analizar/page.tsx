/**
 * /analizar — Upload screen.
 * Hosts <UploadFlow>. See `docs/specs/E01-onboarding-y-upload.md §7`.
 */
import { UploadFlow } from '@/components/upload/UploadFlow';
import { Disclaimer } from '@/components/ui/Disclaimer';

export const metadata = {
  title: 'Analizar etiqueta · NutriLens',
};

export default function AnalizarPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 md:px-6 md:py-12">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-[var(--color-text-muted)]">Hola</p>
        <h1 className="text-3xl font-bold text-[var(--color-text)] md:text-4xl">
          ¿Qué vamos a analizar hoy?
        </h1>
      </header>

      <section aria-label="Cargar etiqueta">
        <UploadFlow />
      </section>

      <footer className="mt-auto">
        <Disclaimer />
      </footer>
    </main>
  );
}
