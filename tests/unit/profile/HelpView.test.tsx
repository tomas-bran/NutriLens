import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HelpSection } from '@/components/profile/HelpView';

describe('<HelpSection> — Ayuda embebida en Mi cuenta', () => {
  it('renderiza el título y el ancla #ayuda', () => {
    const { container } = render(<HelpSection />);
    expect(
      screen.getByRole('heading', { level: 2, name: /¿Cómo te ayudamos\?/ }),
    ).toBeInTheDocument();
    expect(container.querySelector('#ayuda')).not.toBeNull();
  });

  it('lista las preguntas frecuentes y el contacto de soporte', () => {
    render(<HelpSection />);
    expect(screen.getByText('¿Qué es NutriLens?')).toBeInTheDocument();
    expect(screen.getByText('¿Es un consejo médico?')).toBeInTheDocument();
    expect(screen.getByText(/soporte@nutrilens\.app/)).toBeInTheDocument();
  });

  it('abrir/cerrar un FAQ alterna aria-expanded', async () => {
    const user = userEvent.setup();
    render(<HelpSection />);
    // El primero arranca abierto (open=0); abrimos otro y verificamos el toggle.
    const second = screen.getByRole('button', { name: /¿Cómo se calcula el riesgo\?/ });
    expect(second).toHaveAttribute('aria-expanded', 'false');
    await user.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'true');
  });
});
