'use client';

/**
 * <SidebarToggle> — círculo en el borde entre el sidebar y el contenido que
 * "zippea" el sidebar a un rail de íconos (logo + íconos de nav + foto de
 * perfil). Cliente: flipea `data-sidebar` en <html> y lo persiste en
 * localStorage; el CSS (globals.css) hace el colapso. Un script inline en el
 * layout aplica el estado guardado antes del primer paint (sin FOUC).
 *
 * Solo desktop: en mobile la navegación vive en el bottom nav.
 */
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export function SidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);

  // Sincronizamos con lo que dejó el script inline (evita mismatch de hidratación).
  useEffect(() => {
    setCollapsed(document.documentElement.dataset.sidebar === 'collapsed');
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.dataset.sidebar = next ? 'collapsed' : 'expanded';
    try {
      localStorage.setItem('nl-sidebar', next ? 'collapsed' : 'expanded');
    } catch {
      /* localStorage no disponible (modo privado) — el toggle sigue funcionando. */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="sidebar-toggle"
      aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      title={collapsed ? 'Expandir' : 'Colapsar'}
      className="sidebar-toggle fixed top-1/2 z-40 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] shadow-[0_2px_8px_rgba(15,23,42,0.12)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] md:flex"
    >
      <Icon name="chevron-left" className="sidebar-toggle-icon h-3.5 w-3.5 transition-transform" />
    </button>
  );
}
