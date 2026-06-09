/**
 * Unit tests for <HistoryFilters> (US-24 §6.4).
 * Selects push a new URL via `router.push`; el buscador debouncea 300 ms y
 * tambien pushea instantáneo cuando el usuario submitea (Enter).
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
}));

/**
 * Mock del FilterSelect a un `<select>` nativo para los tests integration de
 * HistoryFilters. El comportamiento de Radix UI Select (Portal + keyboard nav)
 * se cubre en `tests/unit/ui/FilterSelect.test.tsx` aparte; acá solo queremos
 * asegurar que `HistoryFilters` cablea bien el `onValueChange` con la URL.
 */
vi.mock('@/components/ui/FilterSelect', () => ({
  FilterSelect: (props: {
    label: string;
    value: string;
    onValueChange: (next: string) => void;
    options: ReadonlyArray<{ value: string; label: string }>;
    testId: string;
  }) => (
    <select
      data-testid={props.testId}
      aria-label={props.label}
      value={props.value}
      onChange={(e) => props.onValueChange(e.target.value)}
    >
      <option value="">Todas</option>
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

import { HistoryFilters } from '@/components/history/HistoryFilters';

describe('<HistoryFilters>', () => {
  beforeEach(() => {
    push.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders one select for each filter dimension', () => {
    render(<HistoryFilters value={{ page: 1 }} />);
    expect(screen.getByTestId('history-filter-categoria')).toBeInTheDocument();
    expect(screen.getByTestId('history-filter-riesgo')).toBeInTheDocument();
    expect(screen.getByTestId('history-filter-alergeno')).toBeInTheDocument();
    expect(screen.getByTestId('history-filter-apto')).toBeInTheDocument();
  });

  it('reflects the current filter value in each select', () => {
    render(
      <HistoryFilters
        value={{
          categoria: 'galletitas',
          riesgo: 'alto',
          alergeno: 'gluten',
          apto: 'vegano',
          q: 'choco',
          page: 1,
        }}
      />,
    );
    expect(screen.getByTestId('history-filter-categoria')).toHaveValue('galletitas');
    expect(screen.getByTestId('history-filter-riesgo')).toHaveValue('alto');
    expect(screen.getByTestId('history-filter-alergeno')).toHaveValue('gluten');
    expect(screen.getByTestId('history-filter-apto')).toHaveValue('vegano');
    expect(screen.getByTestId('history-search-input')).toHaveValue('choco');
  });

  it('pushes a URL with the new categoria when select changes', () => {
    render(<HistoryFilters value={{ page: 3 }} />);
    fireEvent.change(screen.getByTestId('history-filter-categoria'), {
      target: { value: 'galletitas' },
    });
    expect(push).toHaveBeenCalledWith('/historial?categoria=galletitas', { scroll: false });
  });

  it('resets page=1 when changing a filter (page=3 → /historial?categoria=...)', () => {
    render(<HistoryFilters value={{ page: 3 }} />);
    fireEvent.change(screen.getByTestId('history-filter-riesgo'), {
      target: { value: 'medio' },
    });
    // page omitted in URL because the helper drops page=1
    expect(push).toHaveBeenCalledWith('/historial?riesgo=medio', { scroll: false });
  });

  it('clears the filter when the user picks the "Todas" option', () => {
    render(<HistoryFilters value={{ categoria: 'snacks', page: 1 }} />);
    fireEvent.change(screen.getByTestId('history-filter-categoria'), {
      target: { value: '' },
    });
    expect(push).toHaveBeenCalledWith('/historial', { scroll: false });
  });

  it('submits the search input by pushing q=<value>', () => {
    render(<HistoryFilters value={{ page: 1 }} />);
    const input = screen.getByTestId('history-search-input');
    fireEvent.change(input, { target: { value: 'leche' } });
    fireEvent.submit(input.closest('form')!);
    expect(push).toHaveBeenCalledWith('/historial?q=leche', { scroll: false });
  });

  it('treats whitespace-only search input as no filter', () => {
    render(<HistoryFilters value={{ q: 'something', page: 1 }} />);
    const input = screen.getByTestId('history-search-input');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);
    expect(push).toHaveBeenCalledWith('/historial', { scroll: false });
  });

  describe('debounce del buscador (auditoría 2026-05)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('NO pushea hasta que pasaron 300ms del último keystroke', () => {
      render(<HistoryFilters value={{ page: 1 }} />);
      const input = screen.getByTestId('history-search-input');
      fireEvent.change(input, { target: { value: 'l' } });
      fireEvent.change(input, { target: { value: 'le' } });
      fireEvent.change(input, { target: { value: 'lec' } });
      // Antes del tick → ningún push.
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(push).not.toHaveBeenCalled();
      // Cumplido el delay → push con el último valor.
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(push).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith('/historial?q=lec', { scroll: false });
    });

    it('cancela el push anterior si el usuario sigue tipeando antes del tick', () => {
      render(<HistoryFilters value={{ page: 1 }} />);
      const input = screen.getByTestId('history-search-input');
      fireEvent.change(input, { target: { value: 'le' } });
      act(() => {
        vi.advanceTimersByTime(250);
      });
      fireEvent.change(input, { target: { value: 'leche' } });
      act(() => {
        vi.advanceTimersByTime(250);
      });
      // Acumulados 500ms desde el primer cambio, pero el último fue hace
      // 250ms → todavía sin push.
      expect(push).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(push).toHaveBeenCalledOnce();
      expect(push).toHaveBeenCalledWith('/historial?q=leche', { scroll: false });
    });

    it('limpia el filtro `q` cuando el usuario borra el input (string vacío)', () => {
      render(<HistoryFilters value={{ q: 'leche', page: 1 }} />);
      const input = screen.getByTestId('history-search-input');
      fireEvent.change(input, { target: { value: '' } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(push).toHaveBeenCalledWith('/historial', { scroll: false });
    });

    it('submit (Enter) pushea inmediato sin esperar el debounce', () => {
      render(<HistoryFilters value={{ page: 1 }} />);
      const input = screen.getByTestId('history-search-input');
      fireEvent.change(input, { target: { value: 'instant' } });
      fireEvent.submit(input.closest('form')!);
      expect(push).toHaveBeenCalledWith('/historial?q=instant', { scroll: false });
    });

    it('no pushea cuando el debounced normalizado coincide con el valor actual', () => {
      render(<HistoryFilters value={{ q: 'leche', page: 1 }} />);
      const input = screen.getByTestId('history-search-input');
      // El usuario re-tipea el mismo texto (con espacios).
      fireEvent.change(input, { target: { value: '  leche  ' } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(push).not.toHaveBeenCalled();
    });
  });
});

describe('<HistoryFilters> — bottomsheet en mobile', () => {
  it('muestra el contador de filtros activos en el botón "Filtros"', () => {
    render(<HistoryFilters value={{ categoria: 'galletitas', riesgo: 'alto', page: 1 }} />);
    expect(screen.getByTestId('history-filter-count')).toHaveTextContent('2');
  });

  it('no renderiza el contador cuando no hay filtros activos (solo la búsqueda no cuenta)', () => {
    render(<HistoryFilters value={{ q: 'choco', page: 1 }} />);
    expect(screen.queryByTestId('history-filter-count')).not.toBeInTheDocument();
  });

  it('el botón "Filtros" abre el bottomsheet (el toolbar pasa a panel fixed + backdrop)', () => {
    render(<HistoryFilters value={{ page: 1 }} />);
    // Cerrado: el toolbar está oculto y no hay backdrop ni botón cerrar.
    expect(screen.getByTestId('history-filter-toolbar').className).toContain('hidden');
    expect(screen.queryByTestId('history-filter-backdrop')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('history-filter-open'));

    // Abierto: el toolbar es un panel fixed al fondo + aparece backdrop y cerrar.
    const toolbar = screen.getByTestId('history-filter-toolbar');
    expect(toolbar.className).toContain('fixed');
    expect(toolbar.className).toContain('bottom-0');
    expect(screen.getByTestId('history-filter-backdrop')).toBeInTheDocument();
    expect(screen.getByTestId('history-filter-close')).toBeInTheDocument();
  });

  it('el botón cerrar y el backdrop cierran el bottomsheet', () => {
    render(<HistoryFilters value={{ page: 1 }} />);
    fireEvent.click(screen.getByTestId('history-filter-open'));
    fireEvent.click(screen.getByTestId('history-filter-close'));
    expect(screen.getByTestId('history-filter-toolbar').className).toContain('hidden');

    fireEvent.click(screen.getByTestId('history-filter-open'));
    fireEvent.click(screen.getByTestId('history-filter-backdrop'));
    expect(screen.getByTestId('history-filter-toolbar').className).toContain('hidden');
  });
});
