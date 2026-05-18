/**
 * Tests del renderer markdown mínimo (US-31).
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownMini, hasMarkdownTable } from '@/components/chat/markdown-mini';

describe('hasMarkdownTable', () => {
  it('texto plano → false', () => {
    expect(hasMarkdownTable('Tenés 2 galletitas guardadas.')).toBe(false);
  });

  it('texto con una sola línea pipe (no es tabla) → false', () => {
    expect(hasMarkdownTable('Algo con | pipe en medio')).toBe(false);
  });

  it('texto con tabla GFM → true', () => {
    const md = `Resumen:

| Col | Col |
| --- | --- |
| a   | b   |`;
    expect(hasMarkdownTable(md)).toBe(true);
  });
});

describe('<MarkdownMini> — párrafos', () => {
  it('renderea un párrafo simple', () => {
    render(<MarkdownMini text="Tenés galletitas guardadas." />);
    expect(screen.getByText('Tenés galletitas guardadas.')).toBeInTheDocument();
  });

  it('renderea párrafos múltiples separados por línea en blanco', () => {
    render(<MarkdownMini text={'Primera oración.\n\nSegunda oración.'} />);
    expect(screen.getByText('Primera oración.')).toBeInTheDocument();
    expect(screen.getByText('Segunda oración.')).toBeInTheDocument();
  });
});

describe('<MarkdownMini> — bold inline', () => {
  it('**texto** → <strong>texto</strong>', () => {
    render(<MarkdownMini text="Te recomiendo **Galletitas X** por su perfil." />);
    expect(screen.getByText('Galletitas X').tagName).toBe('STRONG');
  });
});

describe('<MarkdownMini> — tablas GFM (US-31)', () => {
  const compareMd = `Acá comparamos las dos:

| Dimensión   | Galletitas X | Galletitas Y       |
| ----------- | ------------ | ------------------ |
| Riesgo      | bajo         | medio              |
| Alérgenos   | ninguno      | gluten             |
| Sellos      | ninguno      | exceso en azúcares |

Te recomiendo Galletitas X.`;

  it('renderea una <table> con header y filas correctas', () => {
    render(<MarkdownMini text={compareMd} />);
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    // Header
    const head = within(table).getAllByRole('columnheader');
    expect(head.map((th) => th.textContent)).toEqual(['Dimensión', 'Galletitas X', 'Galletitas Y']);
    // 3 filas de datos
    const dataRows = within(table)
      .getAllByRole('row')
      .filter((tr) => within(tr).queryAllByRole('cell').length > 0);
    expect(dataRows).toHaveLength(3);
  });

  it('renderea contenido de celdas con tildes intacto', () => {
    render(<MarkdownMini text={compareMd} />);
    expect(screen.getByRole('cell', { name: 'gluten' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'exceso en azúcares' })).toBeInTheDocument();
  });

  it('párrafo antes y después de la tabla se rendea', () => {
    render(<MarkdownMini text={compareMd} />);
    expect(screen.getByText('Acá comparamos las dos:')).toBeInTheDocument();
    expect(screen.getByText('Te recomiendo Galletitas X.')).toBeInTheDocument();
  });

  it('tabla mal-formada (sin separador) cae a párrafo plano sin romper', () => {
    const broken = `| Header sin separador |
| Fila 1               |`;
    render(<MarkdownMini text={broken} />);
    // No hay <table>, pero el texto debería estar visible.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
