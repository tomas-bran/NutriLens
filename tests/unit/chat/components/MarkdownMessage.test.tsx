/**
 * Tests del <MarkdownMessage> (NL-303 / AB#70).
 *
 * AC cubiertos:
 *   1. Negritas, listas, tablas y código renderizan correctamente.
 *   2. Contenido sanitizado (sin HTML arbitrario / XSS).
 *   3. (mensajes del usuario en texto plano → se testea en UserBubble.test).
 *   4. Tests de render con snapshots.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownMessage } from '@/components/chat/MarkdownMessage';

describe('<MarkdownMessage> — AC#1 formato (bold/italic/listas/tablas/código)', () => {
  it('renderiza negritas con <strong>', () => {
    render(<MarkdownMessage text="Te recomiendo **Galletitas X** por su perfil." />);
    expect(screen.getByText('Galletitas X').tagName).toBe('STRONG');
  });

  it('renderiza itálicas con <em>', () => {
    render(<MarkdownMessage text="Es *muy* saludable." />);
    expect(screen.getByText('muy').tagName).toBe('EM');
  });

  it('renderiza listas no ordenadas con <ul><li>', () => {
    const md = `Opciones:

- Galletitas de arroz
- Cereales integrales
- Snacks de fruta`;
    const { container } = render(<MarkdownMessage text={md} />);
    const ul = container.querySelector('ul');
    expect(ul).not.toBeNull();
    expect(within(ul as HTMLElement).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Cereales integrales')).toBeInTheDocument();
  });

  it('renderiza listas ordenadas con <ol><li>', () => {
    const md = `Pasos:

1. Mirá la etiqueta
2. Compará sellos
3. Elegí`;
    const { container } = render(<MarkdownMessage text={md} />);
    const ol = container.querySelector('ol');
    expect(ol).not.toBeNull();
    expect(within(ol as HTMLElement).getAllByRole('listitem')).toHaveLength(3);
  });

  it('renderiza tablas GFM con header y filas', () => {
    const md = `Comparación:

| Dimensión | Galletitas X | Galletitas Y |
| --------- | ------------ | ------------ |
| Riesgo    | bajo         | medio        |
| Alérgenos | ninguno      | gluten       |`;
    render(<MarkdownMessage text={md} />);
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual([
      'Dimensión',
      'Galletitas X',
      'Galletitas Y',
    ]);
    const dataRows = within(table)
      .getAllByRole('row')
      .filter((tr) => within(tr).queryAllByRole('cell').length > 0);
    expect(dataRows).toHaveLength(2);
    expect(within(table).getByText('gluten')).toBeInTheDocument();
  });

  it('renderiza código inline con <code> (pastilla)', () => {
    render(<MarkdownMessage text="Usá el campo `confidence` del JSON." />);
    const code = screen.getByText('confidence');
    expect(code.tagName).toBe('CODE');
  });

  it('renderiza bloques de código cercados dentro de <pre>', () => {
    const md = '```json\n{"riesgo":"bajo"}\n```';
    const { container } = render(<MarkdownMessage text={md} />);
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toContain('"riesgo":"bajo"');
  });

  it('renderiza tildes y caracteres especiales intactos', () => {
    render(<MarkdownMessage text="**Limón** y **maní** con azúcar añadido." />);
    expect(screen.getByText('Limón')).toBeInTheDocument();
    expect(screen.getByText('maní')).toBeInTheDocument();
  });
});

describe('<MarkdownMessage> — AC#2 sanitización / XSS', () => {
  it('NO ejecuta ni renderiza HTML arbitrario embebido (script)', () => {
    const malicious = 'Hola <script>window.__xss=1</script> mundo';
    const { container } = render(<MarkdownMessage text={malicious} />);
    // react-markdown no parsea HTML → no hay <script> en el DOM.
    expect(container.querySelector('script')).toBeNull();
    // El flag no se setea.
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it('NO renderiza <img onerror> como elemento HTML', () => {
    const malicious = 'Texto <img src=x onerror="window.__xss2=1" /> más texto';
    const { container } = render(<MarkdownMessage text={malicious} />);
    // El <img> embebido como HTML crudo no se interpreta.
    expect(container.querySelector('img[onerror]')).toBeNull();
    expect((window as unknown as { __xss2?: number }).__xss2).toBeUndefined();
  });

  it('descarta protocolo javascript: en links markdown', () => {
    render(<MarkdownMessage text="[click](javascript:alert(1))" />);
    const link = screen.getByText('click').closest('a');
    // react-markdown urlTransform vacía/neutraliza el href peligroso.
    const href = link?.getAttribute('href') ?? '';
    expect(href.startsWith('javascript:')).toBe(false);
  });

  it('links externos válidos abren con rel="noopener noreferrer" y target="_blank"', () => {
    render(<MarkdownMessage text="[Open Food Facts](https://world.openfoodfacts.org)" />);
    const link = screen.getByText('Open Food Facts').closest('a');
    expect(link?.getAttribute('href')).toBe('https://world.openfoodfacts.org');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });
});

describe('<MarkdownMessage> — AC#4 snapshots', () => {
  it('snapshot: respuesta con bold + lista + tabla', () => {
    const md = `Tenés **3 galletitas** guardadas. Las más saludables:

1. Galletitas de arroz
2. Galletitas integrales

| Producto | Riesgo |
| -------- | ------ |
| Arroz    | bajo   |
| Choco    | alto   |

Basado en productos analizados por vos.`;
    const { container } = render(<MarkdownMessage text={md} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('snapshot: texto plano simple', () => {
    const { container } = render(
      <MarkdownMessage text="No tengo productos guardados que respondan a esa pregunta." />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
