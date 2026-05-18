import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatErrorBanner } from '@/components/chat/ChatErrorBanner';

describe('<ChatErrorBanner> — estado ERROR (spec §9.4)', () => {
  it('muestra el mensaje de error con rol alert', () => {
    render(<ChatErrorBanner message="Algo salió mal" onRetry={vi.fn()} canRetry />);
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent('Algo salió mal');
  });

  it('muestra botón "Reintentar último mensaje" cuando canRetry=true', () => {
    render(<ChatErrorBanner message="x" onRetry={vi.fn()} canRetry />);
    expect(screen.getByTestId('chat-retry')).toBeInTheDocument();
  });

  it('oculta el botón retry cuando canRetry=false', () => {
    render(<ChatErrorBanner message="x" onRetry={vi.fn()} canRetry={false} />);
    expect(screen.queryByTestId('chat-retry')).not.toBeInTheDocument();
  });

  it('clickear retry dispara onRetry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ChatErrorBanner message="x" onRetry={onRetry} canRetry />);
    await user.click(screen.getByTestId('chat-retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
