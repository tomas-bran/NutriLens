/**
 * Unit tests for <AppShell> — desktop sidebar + mobile brand strip + mobile bottom nav.
 * Pencil references:
 *   - `iLsWo` Component/Desktop/Sidebar
 *   - `Z2rHzQ` Component/Mobile/BottomNav
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

describe('<AppShell> — mobile bottom navigation (Pencil Z2rHzQ)', () => {
  it('renders the bottom nav with the same 4 routes as the sidebar', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('bottom-nav-inicio')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('bottom-nav-analizar')).toHaveAttribute('href', '/analizar');
    expect(screen.getByTestId('bottom-nav-historial')).toHaveAttribute('href', '/historial');
    expect(screen.getByTestId('bottom-nav-chat')).toHaveAttribute('href', '/chat');
  });

  it('marks the active item with aria-current="page"', () => {
    render(
      <AppShell active="analizar">
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('bottom-nav-analizar')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('bottom-nav-inicio')).not.toHaveAttribute('aria-current');
  });

  it('bottom nav container is fixed at the bottom and labelled', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    const nav = screen.getByTestId('app-bottom-nav');
    expect(nav.className).toContain('fixed');
    expect(nav.className).toContain('bottom-0');
    expect(nav).toHaveAttribute('aria-label', 'Navegación principal');
  });

  it('hides the historial badge when count is 0', () => {
    render(
      <AppShell historialCount={0}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('bottom-nav-historial')).not.toHaveTextContent('0');
  });

  it('shows the historial badge when count > 0', () => {
    render(
      <AppShell historialCount={24}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('bottom-nav-historial')).toHaveTextContent('24');
  });

  it('caps the badge label at "99+" for large counts', () => {
    render(
      <AppShell historialCount={150}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('bottom-nav-historial')).toHaveTextContent('99+');
  });

  it('container has extra bottom padding on mobile to clear the bottom nav', () => {
    const { container } = render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    const root = container.firstChild as HTMLElement;
    // pb-24 on mobile, md:pb-4 reverts the offset on desktop.
    expect(root.className).toContain('pb-24');
    expect(root.className).toContain('md:pb-4');
  });
});
