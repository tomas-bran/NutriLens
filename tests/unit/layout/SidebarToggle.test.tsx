import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { SidebarToggle } from '@/components/layout/SidebarToggle';

beforeEach(() => {
  delete document.documentElement.dataset.sidebar;
  localStorage.clear();
});

describe('<SidebarToggle> — colapsar/expandir el sidebar', () => {
  it('arranca en modo expandir (sin data-sidebar) con su aria-label', () => {
    render(<SidebarToggle />);
    expect(screen.getByTestId('sidebar-toggle')).toHaveAttribute('aria-label', 'Colapsar menú');
  });

  it('al clickear flipea data-sidebar + lo persiste en localStorage', async () => {
    const user = userEvent.setup();
    render(<SidebarToggle />);
    const btn = screen.getByTestId('sidebar-toggle');

    await user.click(btn);
    expect(document.documentElement.dataset.sidebar).toBe('collapsed');
    expect(localStorage.getItem('nl-sidebar')).toBe('collapsed');
    expect(btn).toHaveAttribute('aria-label', 'Expandir menú');

    await user.click(btn);
    expect(document.documentElement.dataset.sidebar).toBe('expanded');
    expect(localStorage.getItem('nl-sidebar')).toBe('expanded');
  });
});
