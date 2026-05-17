/**
 * Unit tests for <HistoryFilters> (US-24 §6.4).
 * Selects push a new URL via `router.push`; the search form pushes on submit.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
}));

import { HistoryFilters } from '@/components/history/HistoryFilters';

describe('<HistoryFilters>', () => {
  beforeEach(() => {
    push.mockClear();
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
});
