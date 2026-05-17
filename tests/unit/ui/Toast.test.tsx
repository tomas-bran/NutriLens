import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Toast } from '@/components/ui/Toast';

describe('<Toast>', () => {
  it('renders the title and (optional) description', () => {
    render(<Toast variant="success" title="Listo" description="Producto guardado" />);
    expect(screen.getByText('Listo')).toBeInTheDocument();
    expect(screen.getByText('Producto guardado')).toBeInTheDocument();
  });

  it('exposes role=status for screen readers', () => {
    render(<Toast variant="info" title="Cargando" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('matches the variant via data-testid', () => {
    const { rerender } = render(<Toast variant="success" title="ok" />);
    expect(screen.getByTestId('toast-success')).toBeInTheDocument();

    rerender(<Toast variant="error" title="x" />);
    expect(screen.getByTestId('toast-error')).toBeInTheDocument();

    rerender(<Toast variant="warning" title="x" />);
    expect(screen.getByTestId('toast-warning')).toBeInTheDocument();

    rerender(<Toast variant="info" title="x" />);
    expect(screen.getByTestId('toast-info')).toBeInTheDocument();
  });

  it('renders dismiss button only when onDismiss is provided', () => {
    const { rerender } = render(<Toast variant="success" title="t" />);
    expect(screen.queryByRole('button', { name: /Cerrar/i })).not.toBeInTheDocument();

    const onDismiss = vi.fn();
    rerender(<Toast variant="success" title="t" onDismiss={onDismiss} />);
    expect(screen.getByRole('button', { name: /Cerrar/i })).toBeInTheDocument();
  });

  it('clicking dismiss fires the callback', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Toast variant="success" title="t" onDismiss={onDismiss} />);
    await user.click(screen.getByRole('button', { name: /Cerrar/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('uses the success palette (#10b981 icon color) for variant=success', () => {
    render(<Toast variant="success" title="t" />);
    const toast = screen.getByTestId('toast-success');
    // The bubble has the variant tint inline-styled
    const bubble = toast.querySelector('span[aria-hidden="true"]');
    expect(bubble).toHaveStyle({ color: '#10b981' });
  });
});
