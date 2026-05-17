import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Examples } from '@/components/home/Examples';

describe('<Examples>', () => {
  it('renders the section heading', () => {
    render(<Examples />);
    expect(screen.getByRole('heading', { level: 2, name: 'Ejemplos válidos' })).toBeInTheDocument();
  });

  it('renders exactly 3 example thumbnails (US-07 §AC1 + spec §8)', () => {
    render(<Examples />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('lists the canonical example titles (frente / ingredientes / tabla nutricional)', () => {
    render(<Examples />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Frente del producto' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Lista de ingredientes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Tabla nutricional' }),
    ).toBeInTheDocument();
  });

  it('uses a horizontal snap carousel on mobile (E06 §6.3 responsive)', () => {
    render(<Examples />);
    const list = screen.getByTestId('examples-list');
    expect(list.className).toContain('snap-x');
    expect(list.className).toContain('overflow-x-auto');
  });

  it('switches to a 3-column grid on md and up', () => {
    render(<Examples />);
    const list = screen.getByTestId('examples-list');
    expect(list.className).toContain('md:grid');
    expect(list.className).toContain('md:grid-cols-3');
  });
});
