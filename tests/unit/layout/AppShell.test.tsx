/**
 * Unit tests del <AppShell> — navegación responsive (NL-502).
 *
 * jsdom no aplica media queries reales: acá validamos estructura + clases
 * responsive (sidebar fijo en desktop / bottom nav en mobile) como proxy; la
 * validación visual por breakpoint vive en `tests/e2e/sidebar-responsive.spec.ts`.
 *
 * Pencil refs: `iLsWo` Component/Desktop/Sidebar + `Q3hjvQ` Component/BottomNav.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from '@/components/layout/AppShell';

describe('<AppShell> — estructura', () => {
  it('renderiza los children dentro de <main>', () => {
    render(
      <AppShell>
        <p>page content</p>
      </AppShell>,
    );
    expect(screen.getByRole('main')).toHaveTextContent('page content');
  });

  it('en mobile es una columna flex de alto fijo (scroll interno); en desktop, grid de 2 columnas', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    const root = screen.getByTestId('app-shell');
    // Mobile: flex column con alto = viewport (el scroll vive dentro de main).
    expect(root.className).toContain('flex');
    expect(root.className).toContain('flex-col');
    expect(root.className).toContain('h-[100dvh]');
    // Desktop: grid de 2 columnas.
    expect(root.className).toContain('md:grid');
    expect(root.className).toContain('md:grid-cols-[15rem_1fr]');
  });

  it('el main es el contenedor de scroll en mobile (flex-1 + overflow-y-auto) y va a la col 2 en desktop', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    const main = screen.getByRole('main');
    expect(main.className).toContain('flex-1');
    expect(main.className).toContain('overflow-y-auto');
    expect(main.className).toContain('md:col-start-2');
    // El scroll del documento se desactiva en desktop (lo maneja el documento).
    expect(main.className).toContain('md:overflow-y-visible');
  });
});

describe('<AppShell> — sidebar (desktop)', () => {
  it('renderiza el sidebar con los 4 nav items (Inicio / Analizar / Catálogo / Chat)', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('nav-inicio')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('nav-analizar')).toHaveAttribute('href', '/analizar');
    expect(screen.getByTestId('nav-catalogo')).toHaveAttribute('href', '/catalogo');
    expect(screen.getByTestId('nav-chat')).toHaveAttribute('href', '/chat');
  });

  it('marca el item activo con aria-current="page"', () => {
    render(
      <AppShell active="inicio">
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('nav-inicio')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('nav-analizar')).not.toHaveAttribute('aria-current');
  });

  it('muestra los labels de cada nav item', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('nav-inicio')).toHaveTextContent('Inicio');
    expect(screen.getByTestId('nav-chat')).toHaveTextContent('Chat');
  });

  it('oculta el badge de catálogo cuando el count es 0', () => {
    render(
      <AppShell catalogoCount={0}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('nav-catalogo')).not.toHaveTextContent(/^Catálogo\s*0$/);
  });

  it('muestra el badge de catálogo cuando el count > 0', () => {
    render(
      <AppShell catalogoCount={24}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('nav-catalogo')).toHaveTextContent('24');
  });

  it('monta el slot de usuario (<SidebarUser>) al pie del sidebar', () => {
    // El footer del sidebar es ahora <SidebarUser> (server component async que
    // resuelve la sesión; NL-201). En tests está stubeado en setup.ts, así que
    // acá verificamos la estructura del shell, no su contenido.
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
  });

  it('el sidebar es fixed (totalmente anclado) y se oculta en mobile (hidden md:flex)', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    const sidebar = screen.getByTestId('app-sidebar');
    expect(sidebar.className).toContain('fixed');
    expect(sidebar.className).toContain('inset-y-0');
    expect(sidebar.className).toContain('left-0');
    // En mobile el sidebar se esconde; reaparece en md.
    expect(sidebar.className.split(/\s+/)).toContain('hidden');
    expect(sidebar.className).toContain('md:flex');
    expect(sidebar.className).toContain('w-60');
  });
});

describe('<AppShell> — bottom nav (mobile)', () => {
  it('renderiza el bottom nav con los 4 nav items', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByTestId('app-bottom-nav')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-nav-inicio')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('bottom-nav-analizar')).toHaveAttribute('href', '/analizar');
    expect(screen.getByTestId('bottom-nav-catalogo')).toHaveAttribute('href', '/catalogo');
    expect(screen.getByTestId('bottom-nav-chat')).toHaveAttribute('href', '/chat');
  });

  it('el bottom nav va al pie (flex-shrink-0, en flujo) y se oculta en desktop (md:hidden)', () => {
    render(
      <AppShell>
        <p>x</p>
      </AppShell>,
    );
    const bottomNav = screen.getByTestId('app-bottom-nav');
    expect(bottomNav.className).toContain('flex-shrink-0');
    expect(bottomNav.className).toContain('md:hidden');
  });
});
