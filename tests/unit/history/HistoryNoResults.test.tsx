/**
 * Unit tests for <HistoryNoResults> (US-24 §AC5).
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

import { HistoryNoResults } from '@/components/history/HistoryNoResults';

describe('<HistoryNoResults>', () => {
  it('renders the empty-with-filters message', () => {
    render(<HistoryNoResults />);
    expect(screen.getByTestId('catalogo-no-results')).toBeInTheDocument();
    expect(screen.getByText(/No encontramos productos con esos filtros/)).toBeInTheDocument();
  });

  it('exposes a Limpiar CTA pointing at /catalogo', () => {
    render(<HistoryNoResults />);
    expect(screen.getByTestId('catalogo-no-results-clear')).toHaveAttribute('href', '/catalogo');
  });
});
