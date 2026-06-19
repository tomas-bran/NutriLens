/**
 * "Documentación" card — acceso al sitio de docs (Docusaurus) desde el inicio.
 * Mismo patrón visual que <HistoryCard>, pero abre un enlace externo en una
 * pestaña nueva. Siempre visible (no depende del catálogo).
 */
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';
import { DOCS_URL } from '@/lib/constants';

export function DocsCallout() {
  return (
    <Card
      padding="md"
      className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Icon name="file-text" className="h-5 w-5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[14px] font-bold text-[var(--color-text)]">
            ¿Cómo se usa NutriLens?
          </h3>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            Guías paso a paso de cada función, con capturas.
          </p>
        </div>
      </div>
      <a
        href={DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="docs-cta"
        className="inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-[13px] font-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 md:self-auto"
      >
        Ver documentación
        <Icon name="external-link" className="h-4 w-4" />
      </a>
    </Card>
  );
}
