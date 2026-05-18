/**
 * Renderer markdown mínimo para las respuestas del chat. Soporta exactamente
 * el subset que emite `chat_answer-v2` (US-31):
 *
 *   - Bold `**texto**`.
 *   - Tablas GitHub-flavored:
 *
 *     | Dimensión | Producto A | Producto B |
 *     | --------- | ---------- | ---------- |
 *     | Riesgo    | bajo       | medio      |
 *
 *   - Párrafos separados por línea en blanco.
 *
 * No usamos `react-markdown` para evitar sumar 50KB+ al bundle por una feature
 * que cubre 1 prompt. Si en el futuro necesitamos más sintaxis (links,
 * listas), evaluamos migrar a una lib.
 *
 * Seguridad: el input ya pasó por `sanitizeChatAnswer` en el back (blocklist
 * de frases clínicas, disclaimer garantizado). Acá NO interpolamos HTML
 * dinámico — sólo construimos JSX a partir de strings, asi que XSS está
 * fuera del riesgo posible.
 */
import { Fragment, type ReactNode } from 'react';

interface MarkdownMiniProps {
  text: string;
}

/**
 * Detecta si el texto contiene una tabla markdown (al menos 2 líneas que
 * empiezan con `|`). Sirve para que el `AssistantBubble` decida si pasar el
 * texto crudo por este renderer o mostrarlo como párrafo plano.
 */
export function hasMarkdownTable(text: string): boolean {
  const lines = text.split('\n');
  let pipeCount = 0;
  for (const l of lines) {
    if (l.trim().startsWith('|')) pipeCount++;
    if (pipeCount >= 2) return true;
  }
  return false;
}

export function MarkdownMini({ text }: MarkdownMiniProps) {
  const blocks = parseBlocks(text);
  return (
    <>
      {blocks.map((block, idx) => (
        <Fragment key={idx}>{renderBlock(block)}</Fragment>
      ))}
    </>
  );
}

type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'table'; header: string[]; rows: string[][] };

/**
 * Parser de bloques: cada bloque es un párrafo (texto separado por línea
 * en blanco) o una tabla (líneas consecutivas que empiezan con `|`).
 */
function parseBlocks(text: string): Block[] {
  const out: Block[] = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim().startsWith('|')) {
      // Acumulamos las líneas seguidas de tabla.
      const tableLines: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('|')) {
        tableLines.push(lines[i]!.trim());
        i++;
      }
      const parsed = parseTable(tableLines);
      if (parsed) {
        out.push(parsed);
      } else {
        // Tabla mal-formada → caemos a párrafo plano (no fallamos).
        out.push({ kind: 'paragraph', text: tableLines.join('\n') });
      }
      continue;
    }
    // Acumulamos las líneas seguidas de texto hasta una línea vacía.
    const paraLines: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== '' && !lines[i]!.trim().startsWith('|')) {
      paraLines.push(lines[i]!);
      i++;
    }
    if (paraLines.length > 0) {
      out.push({ kind: 'paragraph', text: paraLines.join(' ').trim() });
    }
    // Saltamos líneas en blanco.
    while (i < lines.length && lines[i]!.trim() === '') i++;
  }
  return out;
}

/**
 * Convierte un set de líneas de tabla markdown en `{ header, rows }`.
 * Espera al menos 3 líneas: header, separador (`| --- | --- |`) y ≥1 fila.
 */
function parseTable(lines: string[]): Block | null {
  if (lines.length < 3) return null;
  const headerLine = lines[0]!;
  const sepLine = lines[1]!;
  if (!isSeparatorLine(sepLine)) return null;

  const header = splitRow(headerLine);
  const rows = lines.slice(2).map(splitRow);
  if (header.length === 0) return null;
  return { kind: 'table', header, rows };
}

function isSeparatorLine(s: string): boolean {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(s);
}

function splitRow(line: string): string[] {
  // Saca `|` líderes/finales y splitea por `|`. Trimea cada celda.
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function renderBlock(block: Block): ReactNode {
  if (block.kind === 'paragraph') {
    return <p className="my-1 first:mt-0 last:mb-0">{renderInline(block.text)}</p>;
  }
  return (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {block.header.map((h, idx) => (
              <th
                key={idx}
                className="border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-left font-semibold text-[var(--color-text)]"
              >
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r, rIdx) => (
            <tr key={rIdx}>
              {r.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className="border border-[var(--color-border)] px-2 py-1 align-top text-[var(--color-text)]"
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Renderiza un fragmento inline: soporta `**bold**`. Cualquier otro caracter
 * va literal — sin HTML, sin links.
 */
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}
