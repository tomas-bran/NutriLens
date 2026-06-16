/**
 * <MarkdownMessage> — renderiza el texto de una respuesta del asistente como
 * Markdown formateado (negritas, itálicas, listas, tablas GFM, código).
 *
 * NL-303 (AB#70): reemplaza el `markdown-mini` previo (que sólo soportaba
 * tablas + bold) por `react-markdown` + `remark-gfm`. El usuario veía markdown
 * crudo en respuestas con listas/código; ahora se renderiza correctamente.
 *
 * Seguridad (AC #2 — sin HTML arbitrario / XSS):
 *   - `react-markdown` NO interpreta HTML embebido por default (no usamos
 *     `rehype-raw`). Cualquier `<script>`/`<img onerror>` en el texto se
 *     muestra como texto plano, nunca se ejecuta.
 *   - `urlTransform` (built-in en react-markdown 10) descarta protocolos
 *     peligrosos (`javascript:`, `data:`) en links e imágenes.
 *   - Los links externos se abren con `rel="noopener noreferrer"`.
 *
 * Estilos: overrides por elemento con los design tokens de NutriLens. No
 * dependemos de `@tailwindcss/typography` para no acoplar el bundle a un
 * plugin extra.
 */
import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const LINK_CLASS = 'font-medium text-[var(--color-primary)] underline underline-offset-2';

interface MarkdownMessageProps {
  text: string;
}

const COMPONENTS: Components = {
  p: (props) => <p className="my-1.5 first:mt-0 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  ul: (props) => <ul className="my-1.5 list-disc space-y-0.5 pl-5" {...props} />,
  ol: (props) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  h1: (props) => <h1 className="mb-1.5 mt-2 text-base font-bold first:mt-0" {...props} />,
  h2: (props) => <h2 className="mb-1.5 mt-2 text-base font-bold first:mt-0" {...props} />,
  h3: (props) => <h3 className="mb-1 mt-2 text-sm font-bold first:mt-0" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-1.5 border-l-2 border-[var(--color-border)] pl-3 text-[var(--color-text-muted)]"
      {...props}
    />
  ),
  a: ({ href, ...props }) => {
    // Links internos (ej. [Producto](/catalogo/<id>) que emite el chat para
    // referenciar productos del catálogo): navegación SPA en la misma tab.
    // Externos: tab nueva con noopener.
    if (href?.startsWith('/')) {
      const { children, ...rest } = props;
      return (
        <Link href={href} className={LINK_CLASS} {...rest}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS} {...props} />
    );
  },
  table: (props) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props) => <thead {...props} />,
  th: (props) => (
    <th
      className="border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-left font-semibold text-[var(--color-text)]"
      {...props}
    />
  ),
  td: (props) => (
    <td
      className="border border-[var(--color-border)] px-2 py-1 align-top text-[var(--color-text)]"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="my-2 overflow-x-auto rounded-xl bg-[var(--color-bg)] p-3 text-xs leading-relaxed"
      {...props}
    />
  ),
  code: ({ className, ...props }) => {
    // Bloques cercados (```lang) llegan con className "language-…"; van dentro
    // de <pre> (estilo de bloque). El código inline (sin className) recibe la
    // pastilla con fondo.
    const isFenced = typeof className === 'string' && className.startsWith('language-');
    return isFenced ? (
      <code className={`font-mono ${className}`} {...props} />
    ) : (
      <code
        className="rounded bg-[var(--color-bg)] px-1 py-0.5 font-mono text-[0.85em]"
        {...props}
      />
    );
  },
};

export function MarkdownMessage({ text }: MarkdownMessageProps) {
  return (
    <div data-testid="markdown-message" className="break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
