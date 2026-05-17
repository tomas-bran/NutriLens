/**
 * Unit tests for the historial listing (US-23, US-26).
 * Covers: card list with N items, empty state, pagination visibility,
 * "Nuevo análisis" CTA + total count copy.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import { HistoryListView } from '@/components/history/HistoryListView';
import type { ProductListItem } from '@/lib/products/serializers';

function mkItem(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: 'p-1',
    nombre: 'Choco Crunch',
    categoria: 'galletitas',
    riesgo: 'alto',
    alergenos: ['gluten', 'leche'],
    sellos: ['exceso en azúcares'],
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: false,
    imagenUrl: '/uploads/choco-crunch.jpg',
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    ...overrides,
  };
}

describe('<HistoryListView> — empty state (US-26)', () => {
  it('shows the empty state when total === 0', () => {
    render(<HistoryListView items={[]} page={1} totalPages={0} total={0} filters={{ page: 1 }} />);
    expect(screen.getByTestId('history-empty')).toBeInTheDocument();
    expect(screen.getByText(/Todavía no analizaste/)).toBeInTheDocument();
  });

  it('empty-state CTA links to /analizar', () => {
    render(<HistoryListView items={[]} page={1} totalPages={0} total={0} filters={{ page: 1 }} />);
    expect(screen.getByTestId('history-empty-cta')).toHaveAttribute('href', '/analizar');
  });

  it('does NOT render the grid when total is 0', () => {
    render(<HistoryListView items={[]} page={1} totalPages={0} total={0} filters={{ page: 1 }} />);
    expect(screen.queryByTestId('history-grid')).not.toBeInTheDocument();
  });

  it('does NOT render pagination when total is 0', () => {
    render(<HistoryListView items={[]} page={1} totalPages={0} total={0} filters={{ page: 1 }} />);
    expect(screen.queryByTestId('history-pagination')).not.toBeInTheDocument();
  });
});

describe('<HistoryListView> — populated grid (US-23)', () => {
  it('renders one card per item', () => {
    const items = [mkItem({ id: 'a' }), mkItem({ id: 'b' }), mkItem({ id: 'c' })];
    render(
      <HistoryListView items={items} page={1} totalPages={1} total={3} filters={{ page: 1 }} />,
    );
    // Each card has a stable testid; the generic `listitem` role would also
    // pick up nested allergen <li> elements inside each card.
    expect(screen.getByTestId('history-item-a')).toBeInTheDocument();
    expect(screen.getByTestId('history-item-b')).toBeInTheDocument();
    expect(screen.getByTestId('history-item-c')).toBeInTheDocument();
  });

  it('every card links to /historial/[id]', () => {
    const items = [mkItem({ id: 'aaa' }), mkItem({ id: 'bbb' })];
    render(
      <HistoryListView items={items} page={1} totalPages={1} total={2} filters={{ page: 1 }} />,
    );
    expect(screen.getByTestId('history-item-aaa')).toHaveAttribute('href', '/historial/aaa');
    expect(screen.getByTestId('history-item-bbb')).toHaveAttribute('href', '/historial/bbb');
  });

  it('shows the risk badge with the right variant per item', () => {
    const items = [
      mkItem({ id: 'lo', riesgo: 'bajo' }),
      mkItem({ id: 'md', riesgo: 'medio' }),
      mkItem({ id: 'hi', riesgo: 'alto' }),
    ];
    render(
      <HistoryListView items={items} page={1} totalPages={1} total={3} filters={{ page: 1 }} />,
    );
    expect(screen.getByTestId('history-item-lo')).toHaveTextContent('Bajo');
    expect(screen.getByTestId('history-item-md')).toHaveTextContent('Medio');
    expect(screen.getByTestId('history-item-hi')).toHaveTextContent('Alto');
  });

  it('renders the allergen chips when the array is non-empty', () => {
    const items = [mkItem({ id: 'p', alergenos: ['gluten', 'leche'] })];
    render(
      <HistoryListView items={items} page={1} totalPages={1} total={1} filters={{ page: 1 }} />,
    );
    const card = screen.getByTestId('history-item-p');
    const chips = within(card).getByTestId('history-item-allergens');
    expect(within(chips).getAllByRole('listitem')).toHaveLength(2);
  });

  it('omits the allergen list when the item has no allergens', () => {
    const items = [mkItem({ id: 'p', alergenos: [] })];
    render(
      <HistoryListView items={items} page={1} totalPages={1} total={1} filters={{ page: 1 }} />,
    );
    expect(screen.queryByTestId('history-item-allergens')).not.toBeInTheDocument();
  });
});

describe('<HistoryListView> — header copy', () => {
  it('shows singular copy when total is 1', () => {
    render(
      <HistoryListView
        items={[mkItem()]}
        page={1}
        totalPages={1}
        total={1}
        filters={{ page: 1 }}
      />,
    );
    expect(screen.getByTestId('history-total')).toHaveTextContent('1 producto analizado');
  });

  it('shows plural copy when total > 1', () => {
    const items = Array.from({ length: 5 }, (_, i) => mkItem({ id: `p-${i}` }));
    render(
      <HistoryListView items={items} page={1} totalPages={1} total={42} filters={{ page: 1 }} />,
    );
    expect(screen.getByTestId('history-total')).toHaveTextContent('42 productos analizados');
  });

  it('"Nuevo análisis" CTA always links to /analizar', () => {
    render(
      <HistoryListView
        items={[mkItem()]}
        page={1}
        totalPages={1}
        total={1}
        filters={{ page: 1 }}
      />,
    );
    expect(screen.getByTestId('history-new-analysis')).toHaveAttribute('href', '/analizar');
  });
});

describe('<HistoryListView> — pagination', () => {
  it('omits pagination when totalPages <= 1', () => {
    render(
      <HistoryListView
        items={[mkItem()]}
        page={1}
        totalPages={1}
        total={1}
        filters={{ page: 1 }}
      />,
    );
    expect(screen.queryByTestId('history-pagination')).not.toBeInTheDocument();
  });

  it('renders pagination when totalPages > 1', () => {
    const items = Array.from({ length: 12 }, (_, i) => mkItem({ id: `p-${i}` }));
    render(
      <HistoryListView items={items} page={1} totalPages={3} total={36} filters={{ page: 1 }} />,
    );
    expect(screen.getByTestId('history-pagination')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
  });

  it('disables prev when on page 1', () => {
    const items = Array.from({ length: 12 }, (_, i) => mkItem({ id: `p-${i}` }));
    render(
      <HistoryListView items={items} page={1} totalPages={3} total={36} filters={{ page: 1 }} />,
    );
    const prev = screen.getByTestId('history-page-prev');
    expect(prev).toHaveAttribute('aria-disabled', 'true');
  });

  it('disables next when on the last page', () => {
    const items = Array.from({ length: 12 }, (_, i) => mkItem({ id: `p-${i}` }));
    render(
      <HistoryListView items={items} page={3} totalPages={3} total={36} filters={{ page: 1 }} />,
    );
    const next = screen.getByTestId('history-page-next');
    expect(next).toHaveAttribute('aria-disabled', 'true');
  });

  it('enables both prev and next on a middle page', () => {
    const items = Array.from({ length: 12 }, (_, i) => mkItem({ id: `p-${i}` }));
    render(
      <HistoryListView items={items} page={2} totalPages={3} total={36} filters={{ page: 1 }} />,
    );
    expect(screen.getByTestId('history-page-prev')).toHaveAttribute('href', '/historial');
    expect(screen.getByTestId('history-page-next')).toHaveAttribute('href', '/historial?page=3');
  });
});
