/**
 * Unit tests for <HomeView> — covers the two key US-07 escenarios:
 * AC1 (informative landing — hero/cómo funciona/ejemplos visible)
 * AC2 (historial CTA appears only when there are analyzed products).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomeView } from '@/components/home/HomeView';

describe('<HomeView> — common sections (US-07 §AC1)', () => {
  it('renders the hero with title + CTA to /analizar', () => {
    render(<HomeView historyCount={0} />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Entendé qué comés, en segundos\./i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('hero-cta')).toHaveAttribute('href', '/analizar');
  });

  it('renders the "Cómo funciona" section with 3 steps', () => {
    render(<HomeView historyCount={0} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Cómo funciona' })).toBeInTheDocument();
    expect(screen.getAllByText(/^0\d$/)).toHaveLength(3);
  });

  it('renders the "Ejemplos válidos" section with 3 thumbnails', () => {
    render(<HomeView historyCount={0} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Ejemplos válidos' })).toBeInTheDocument();
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

  it('renders the disclaimer footer', () => {
    render(<HomeView historyCount={0} />);
    const disclaimer = screen.getByRole('note');
    expect(disclaimer.textContent).toContain('NutriLens es un asistente informativo');
  });

  it('wraps the page with the AppShell (sidebar visible to assistive tech)', () => {
    render(<HomeView historyCount={0} />);
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
  });
});

describe('<HomeView> — empty history (US-07 §AC2, no products yet)', () => {
  it('does NOT render the "Tu historial" card when count is 0', () => {
    render(<HomeView historyCount={0} />);
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Tu historial' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('history-cta')).not.toBeInTheDocument();
  });
});

describe('<HomeView> — with history (US-07 §AC2, productos previos)', () => {
  it('renders the "Tu historial" card with the count and a link to /historial', () => {
    render(<HomeView historyCount={5} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Tu historial' })).toBeInTheDocument();
    expect(screen.getByText('Ya analizaste 5 productos.')).toBeInTheDocument();
    expect(screen.getByTestId('history-cta')).toHaveAttribute('href', '/historial');
  });

  it('shows the badge count next to the Historial nav item', () => {
    render(<HomeView historyCount={12} />);
    const navItem = screen.getByTestId('nav-historial');
    expect(navItem).toHaveTextContent('12');
  });

  it('singular copy when count is exactly 1', () => {
    render(<HomeView historyCount={1} />);
    expect(screen.getByText('Ya analizaste 1 producto.')).toBeInTheDocument();
  });
});
