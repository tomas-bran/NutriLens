/**
 * Unit tests del <MobileBottomNav> (NL-502) — barra de navegación inferior,
 * solo visible en mobile (`md:hidden`). Comparte `NAV_ITEMS` con el sidebar.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

describe('<MobileBottomNav>', () => {
  it('renderiza los 4 nav items con sus hrefs', () => {
    render(<MobileBottomNav />);
    expect(screen.getByTestId('bottom-nav-inicio')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('bottom-nav-analizar')).toHaveAttribute('href', '/analizar');
    expect(screen.getByTestId('bottom-nav-catalogo')).toHaveAttribute('href', '/catalogo');
    expect(screen.getByTestId('bottom-nav-chat')).toHaveAttribute('href', '/chat');
  });

  it('marca el item activo con aria-current="page"', () => {
    render(<MobileBottomNav active="catalogo" />);
    expect(screen.getByTestId('bottom-nav-catalogo')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('bottom-nav-inicio')).not.toHaveAttribute('aria-current');
  });

  it('cada link expone aria-label (los textos son chicos en mobile)', () => {
    render(<MobileBottomNav />);
    expect(screen.getByTestId('bottom-nav-inicio')).toHaveAttribute('aria-label', 'Inicio');
    expect(screen.getByTestId('bottom-nav-chat')).toHaveAttribute('aria-label', 'Chat');
  });

  it('va al pie en flujo (flex-shrink-0 + border-t) y se oculta en desktop (md:hidden)', () => {
    render(<MobileBottomNav />);
    const nav = screen.getByTestId('app-bottom-nav');
    expect(nav.className).toContain('flex-shrink-0');
    expect(nav.className).toContain('border-t');
    expect(nav.className).toContain('md:hidden');
  });

  it('muestra un punto en Catálogo cuando catalogoCount > 0', () => {
    render(<MobileBottomNav active="inicio" catalogoCount={5} />);
    const link = screen.getByTestId('bottom-nav-catalogo');
    // El badge en mobile es un punto decorativo: un <span aria-hidden> (el svg
    // del ícono también es aria-hidden, por eso filtramos por `span`).
    expect(link.querySelectorAll('span[aria-hidden="true"]').length).toBe(1);
  });

  it('no muestra el punto cuando catalogoCount es 0', () => {
    render(<MobileBottomNav catalogoCount={0} />);
    const link = screen.getByTestId('bottom-nav-catalogo');
    expect(link.querySelectorAll('span[aria-hidden="true"]').length).toBe(0);
  });
});
