/**
 * <JsonViewer> — bloque colapsable con el JSON crudo de la extracción,
 * sintaxis resaltada (prismjs, sólo el lenguaje JSON) y botón "Copiar".
 *
 * Spec: `docs/specs/E06-pipeline-observable-y-ux.md §4` (US-34).
 *
 * Decisiones:
 *  - **Colapsado por default en ambas resoluciones** (§4.2). No saturamos al
 *    usuario casual; el evaluador del TP lo abre cuando lo necesita.
 *  - **Pretty-print**: si el `raw` es JSON parseable, lo re-formateamos con
 *    `JSON.stringify(parsed, null, 2)`. Si no parsea (raro pero defensivo),
 *    mostramos el raw tal cual, sin highlight.
 *  - **prismjs sólo con JSON**: importamos `prismjs/components/prism-json`
 *    para que el bundle quede chico (~5KB). No traemos `prismjs/themes/*` —
 *    los tokens se estilan con CSS local en `globals.css`.
 *  - **Copiar**: `navigator.clipboard.writeText` con fallback silencioso
 *    para entornos viejos (jsdom no expone clipboard a menos que se
 *    configure). Feedback "¡Copiado!" durante 2s.
 */
'use client';

import { useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import { Icon } from '@/components/ui/Icon';

interface JsonViewerProps {
  raw: string;
  /** Override del colapsable inicial — útil en tests. */
  defaultOpen?: boolean;
}

export function JsonViewer({ raw, defaultOpen = false }: JsonViewerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const { pretty, highlighted } = formatAndHighlight(raw);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pretty);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API puede fallar en HTTP, iframes, jsdom sin permisos.
      // No mostramos error al usuario — el JSON sigue siendo visible.
    }
  };

  return (
    <section
      data-testid="json-viewer"
      aria-labelledby="json-viewer-title"
      className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          data-testid="json-viewer-toggle"
          aria-expanded={open}
          aria-controls="json-viewer-body"
          className="flex flex-1 items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
        >
          <h2
            id="json-viewer-title"
            className="text-sm font-bold text-[var(--color-text)] md:text-base"
          >
            JSON extraído
          </h2>
          <Icon
            name="arrow-right"
            aria-hidden="true"
            className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform ${
              open ? 'rotate-90' : ''
            }`}
          />
        </button>
      </div>

      {open && (
        <div id="json-viewer-body" className="flex flex-col gap-2">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCopy}
              data-testid="json-viewer-copy"
              aria-label="Copiar JSON al portapapeles"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
            >
              <Icon name="file-text" className="h-3.5 w-3.5" aria-hidden="true" />
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
          <pre
            data-testid="json-viewer-content"
            className="max-h-96 overflow-auto rounded-xl bg-[var(--color-bg)] p-3 text-xs leading-relaxed md:text-sm"
          >
            {highlighted ? (
              <code
                className="language-json"
                // eslint-disable-next-line react/no-danger -- highlighted ya pasó por Prism, que escapa HTML
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            ) : (
              <code className="language-json">{pretty}</code>
            )}
          </pre>
        </div>
      )}
    </section>
  );
}

interface FormatResult {
  /** Texto plano que va al clipboard. */
  pretty: string;
  /** HTML resaltado por Prism (null si no se pudo highlight). */
  highlighted: string | null;
}

function formatAndHighlight(raw: string): FormatResult {
  let pretty = raw;
  try {
    const parsed = JSON.parse(raw);
    pretty = JSON.stringify(parsed, null, 2);
  } catch {
    // Si no parsea, mostramos el raw sin formato pero sin romper el viewer.
    return { pretty: raw, highlighted: null };
  }
  try {
    const grammar = Prism.languages.json;
    if (!grammar) return { pretty, highlighted: null };
    return { pretty, highlighted: Prism.highlight(pretty, grammar, 'json') };
  } catch {
    return { pretty, highlighted: null };
  }
}
