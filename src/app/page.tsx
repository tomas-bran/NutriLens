/**
 * Home / inicio.
 *
 * Esta página es un placeholder del Sprint 0. La implementación real vive en
 * la US-07 (E01) — ver `docs/specs/E01-onboarding-y-upload.md §8`.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-bold text-text">NutriLens</h1>
      <p className="text-lg text-text-muted">
        Asistente informativo que analiza etiquetas alimentarias con IA multimodal.
      </p>
      <p className="text-sm text-text-muted">
        Sprint 0 — bootstrap. Las pantallas reales vienen en los siguientes sprints (ver{' '}
        <code className="font-mono text-xs">docs/specs/</code>).
      </p>
    </main>
  );
}
