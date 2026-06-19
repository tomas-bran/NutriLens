import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HelpSection } from '@/components/profile/HelpView';
import { DOCS_URL } from '@/lib/constants';

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
    expect(screen.getByText('¿Es un consejero médico?')).toBeInTheDocument();
    expect(screen.getByText(/soporte@nutrilens\.app/)).toBeInTheDocument();
  });

  it('ofrece un acceso externo a la documentación', () => {
    render(<HelpSection />);
    const docsLink = screen.getByRole('link', { name: /Ver documentación/i });
    expect(docsLink).toHaveAttribute('href', DOCS_URL);
    expect(docsLink).toHaveAttribute('target', '_blank');
    expect(docsLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
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
