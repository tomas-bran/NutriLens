/**
 * Unit tests for <ActiveFilterChips> (US-24 §6.4).
 * Each chip clears its own filter; "Limpiar todo" clears everything.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    scroll: _scroll,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    scroll?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { ActiveFilterChips } from '@/components/history/ActiveFilterChips';

describe('<ActiveFilterChips>', () => {
  it('renders nothing when no filter is active', () => {
    const { container } = render(<ActiveFilterChips filters={{ page: 1 }} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one chip per active filter', () => {
    render(
      <ActiveFilterChips
        filters={{ categoria: 'galletitas', riesgo: 'alto', q: 'choco', page: 1 }}
      />,
    );
    expect(screen.getByTestId('filter-chip-categoria')).toBeInTheDocument();
    expect(screen.getByTestId('filter-chip-riesgo')).toBeInTheDocument();
    expect(screen.getByTestId('filter-chip-q')).toBeInTheDocument();
  });

  it('each chip links to the catálogo URL without that filter', () => {
    render(<ActiveFilterChips filters={{ categoria: 'galletitas', riesgo: 'alto', page: 1 }} />);
    // Removing `categoria` leaves only `riesgo`.
    expect(screen.getByTestId('filter-chip-categoria')).toHaveAttribute(
      'href',
      '/catalogo?riesgo=alto',
    );
    // Removing `riesgo` leaves only `categoria`.
    expect(screen.getByTestId('filter-chip-riesgo')).toHaveAttribute(
      'href',
      '/catalogo?categoria=galletitas',
    );
  });

  it('shows "Limpiar todo" only when more than one filter is active', () => {
    const { rerender } = render(<ActiveFilterChips filters={{ categoria: 'snacks', page: 1 }} />);
    expect(screen.queryByTestId('filter-clear-all')).not.toBeInTheDocument();

    rerender(<ActiveFilterChips filters={{ categoria: 'snacks', riesgo: 'medio', page: 1 }} />);
    expect(screen.getByTestId('filter-clear-all')).toHaveAttribute('href', '/catalogo');
  });
});
