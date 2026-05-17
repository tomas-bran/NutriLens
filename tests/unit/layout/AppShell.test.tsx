/**
 * Unit tests for <AppShell> — the desktop sidebar + mobile brand strip wrapper.
 * Pencil reference: `iLsWo` Component/Desktop/Sidebar.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from '@/components/layout/AppShell';

describe('<AppShell>', () => {
  it('renders its children inside <main>', () => {
    render(
      <AppShell>
        <p>page content</p>
      </AppShell>,
    );
    expect(screen.getByRole('main')).toHaveTextContent('page content');
  });

  it('renders the sidebar with 4 nav items (Inicio / Analizar / Historial / Chat)', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('nav-inicio')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('nav-analizar')).toHaveAttribute('href', '/analizar');
    expect(screen.getByTestId('nav-historial')).toHaveAttribute('href', '/historial');
    expect(screen.getByTestId('nav-chat')).toHaveAttribute('href', '/chat');
  });

  it('marks the active item with aria-current="page"', () => {
    render(
      <AppShell active="inicio">
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('nav-inicio')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('nav-analizar')).not.toHaveAttribute('aria-current');
  });

  it('hides the historial badge when count is 0', () => {
    render(
      <AppShell historialCount={0}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('nav-historial')).not.toHaveTextContent(/^Historial\s*0$/);
  });

  it('shows the historial badge when count > 0', () => {
    render(
      <AppShell historialCount={24}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('nav-historial')).toHaveTextContent('24');
  });

  it('sidebar is sticky positioned (CSS class) so it stays in view while scrolling', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    const sidebar = screen.getByTestId('app-sidebar');
    expect(sidebar.className).toContain('sticky');
    expect(sidebar.className).toContain('top-4');
  });

  it('renders the team identity card at the bottom of the sidebar', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByText('Equipo NutriLens')).toBeInTheDocument();
    expect(screen.getByText(/4 · UNLaM/)).toBeInTheDocument();
  });
});
