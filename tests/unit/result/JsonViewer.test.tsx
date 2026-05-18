/**
 * Tests del <JsonViewer> — render colapsado por default, expand, copia al
 * clipboard, pretty-print, fallback con JSON inválido. Spec E06 §4 (US-34).
 */
import { fireEvent, render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JsonViewer } from '@/components/result/JsonViewer';

const SAMPLE_RAW = JSON.stringify({
  producto: 'Galletitas Choco Crunch',
  categoria: 'galletitas',
  ingredientes_detectados: ['harina', 'azúcar', 'cacao'],
});

describe('<JsonViewer> — colapsado por default (E06 §4.2 / US-34 §2)', () => {
  it('al renderizar, el cuerpo NO está visible', () => {
    render(<JsonViewer raw={SAMPLE_RAW} />);
    expect(screen.queryByTestId('json-viewer-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('json-viewer-copy')).not.toBeInTheDocument();
  });

  it('aria-expanded del toggle es false al inicio', () => {
    render(<JsonViewer raw={SAMPLE_RAW} />);
    const toggle = screen.getByTestId('json-viewer-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('click en toggle expande y muestra el JSON (US-34 §1)', async () => {
    const user = userEvent.setup();
    render(<JsonViewer raw={SAMPLE_RAW} />);
    await user.click(screen.getByTestId('json-viewer-toggle'));
    expect(screen.getByTestId('json-viewer-content')).toBeVisible();
    expect(screen.getByTestId('json-viewer-content').textContent).toContain('Choco Crunch');
  });
});

describe('<JsonViewer> — pretty-print y sintaxis (US-34 §1)', () => {
  it('reformatea el JSON con indent de 2 espacios', () => {
    render(<JsonViewer raw={SAMPLE_RAW} defaultOpen />);
    const content = screen.getByTestId('json-viewer-content');
    // Pretty-printed tiene saltos de línea + indent.
    expect(content.textContent).toContain('"producto": "Galletitas Choco Crunch"');
    expect(content.textContent).toMatch(/\n {2}"categoria"/);
  });

  it('renderiza highlight de Prism (clases token-* dentro del <code>)', () => {
    const { container } = render(<JsonViewer raw={SAMPLE_RAW} defaultOpen />);
    // Prism inserta spans con class="token property", "token string", etc.
    expect(container.querySelectorAll('.token').length).toBeGreaterThan(0);
  });

  it('JSON inválido NO rompe el viewer (cae a texto plano)', () => {
    render(<JsonViewer raw="esto no es JSON {{{" defaultOpen />);
    expect(screen.getByTestId('json-viewer-content').textContent).toContain('esto no es JSON');
  });
});

describe('<JsonViewer> — copiar al clipboard (US-34 §1)', () => {
  // happy-dom expone una instancia real de Clipboard pero el método writeText
  // vive en el prototype. `Object.defineProperty` sobre la instancia define
  // una own prop que shadowa el prototype, y vi.fn() lo intercepta.
  let writeTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: writeTextSpy,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Eliminamos la own prop para que el siguiente test la reinstale fresco.
    delete (navigator.clipboard as unknown as { writeText?: unknown }).writeText;
  });

  it('click en "Copiar" escribe el JSON formateado al clipboard', async () => {
    render(<JsonViewer raw={SAMPLE_RAW} defaultOpen />);
    // Usamos fireEvent (síncrono) en vez de userEvent para evitar el race
    // entre fake-timers/microtasks que satura el test runner.
    await act(async () => {
      fireEvent.click(screen.getByTestId('json-viewer-copy'));
    });
    expect(writeTextSpy).toHaveBeenCalledOnce();
    const written = writeTextSpy.mock.calls[0]![0] as string;
    expect(written).toContain('"producto": "Galletitas Choco Crunch"');
  });

  it('muestra "¡Copiado!" tras el click y vuelve a "Copiar" después de 2s', async () => {
    // Instalamos fake timers ANTES del click — así el setTimeout(2000) que
    // hace `handleCopy` se registra contra el reloj fake y podemos avanzarlo.
    vi.useFakeTimers();
    try {
      render(<JsonViewer raw={SAMPLE_RAW} defaultOpen />);
      const btn = screen.getByTestId('json-viewer-copy');
      expect(btn).toHaveTextContent('Copiar');

      await act(async () => {
        fireEvent.click(btn);
      });
      expect(btn).toHaveTextContent('¡Copiado!');

      // Avanzamos los 2s y flusheamos el re-render.
      await act(async () => {
        vi.advanceTimersByTime(2100);
      });
      expect(btn).toHaveTextContent('Copiar');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clipboard.writeText que tira NO rompe el viewer', async () => {
    writeTextSpy.mockReset();
    writeTextSpy.mockRejectedValue(new Error('blocked'));
    render(<JsonViewer raw={SAMPLE_RAW} defaultOpen />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('json-viewer-copy'));
    });
    expect(screen.getByTestId('json-viewer-content')).toBeInTheDocument();
  });
});

describe('<JsonViewer> — defaultOpen override (para tests / debug)', () => {
  it('defaultOpen=true muestra el cuerpo al render', () => {
    render(<JsonViewer raw={SAMPLE_RAW} defaultOpen />);
    expect(screen.getByTestId('json-viewer-content')).toBeVisible();
  });
});
