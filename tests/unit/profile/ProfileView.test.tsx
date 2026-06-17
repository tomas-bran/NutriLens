import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// Las server actions importan la cadena de auth — las stubbeamos.
const saveMyPrefs = vi.fn();
vi.mock('@/lib/prefs/actions', () => ({ saveMyPrefs: (...a: unknown[]) => saveMyPrefs(...a) }));
vi.mock('@/lib/auth/actions', () => ({ signOutAction: vi.fn() }));

import { ProfileView } from '@/components/profile/ProfileView';

const baseProps = {
  user: { name: 'Sofía Méndez', email: 'sofia@nutrilens.app', image: null },
  stats: { analizados: 12, riesgoAlto: 2, sinAlergenos: 5 },
  initialPrefs: { vegano: false, celiaco: false, lactosa: false, avisos: true },
};

describe('<ProfileView> — Mi cuenta', () => {
  it('muestra el perfil, las stats y la sección de Ayuda embebida', () => {
    render(<ProfileView {...baseProps} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeInTheDocument();
    expect(screen.getByText('Sofía Méndez')).toBeInTheDocument();
    expect(screen.getByText('sofia@nutrilens.app')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    // Ayuda embebida (mismo SPA).
    expect(
      screen.getByRole('heading', { level: 2, name: /¿Cómo te ayudamos\?/ }),
    ).toBeInTheDocument();
  });

  it('tiene un back button al inicio', () => {
    render(<ProfileView {...baseProps} />);
    expect(screen.getByRole('link', { name: /Volver al inicio/ })).toHaveAttribute('href', '/');
  });

  it('togglear una preferencia actualiza aria-checked y persiste', async () => {
    const user = userEvent.setup();
    render(<ProfileView {...baseProps} />);
    const vegana = screen.getByRole('switch', { name: 'Dieta vegana' });
    expect(vegana).toHaveAttribute('aria-checked', 'false');
    await user.click(vegana);
    expect(vegana).toHaveAttribute('aria-checked', 'true');
    expect(saveMyPrefs).toHaveBeenCalledWith(expect.objectContaining({ vegano: true }));
  });
});
