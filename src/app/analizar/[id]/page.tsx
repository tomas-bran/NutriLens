/**
 * /analizar/[id] — Result placeholder.
 *
 * The upload flow (US-01/04) redirects here after a successful analysis.
 * The full result UI lands in US-08/09/14/19 (E02/E03) — this is just a
 * landing target so the redirect doesn't 404.
 */
import { Card } from '@/components/ui/Card';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Resultado · NutriLens',
};

export default async function AnalizarResultPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10 md:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-[var(--color-text)]" data-testid="result-heading">
          Análisis completado
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          La pantalla detallada llega en las siguientes stories del MVP.
        </p>
      </header>

      <Card padding="lg">
        <p className="text-sm text-[var(--color-text-muted)]">
          ID del producto: <code className="font-mono text-[var(--color-text)]">{id}</code>
        </p>
      </Card>
    </main>
  );
}
