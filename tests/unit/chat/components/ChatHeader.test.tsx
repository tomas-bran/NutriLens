/**
 * Tests del <ChatHeader> — US-27 §3 (botón "Nueva conversación") y el
 * estado disabled cuando no hay mensajes (no hay nada que resetear).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatHeader } from '@/components/chat/ChatHeader';

describe('<ChatHeader>', () => {
  it('renderea el contador de productos en plural', () => {
    render(<ChatHeader productsInBase={24} hasMessages={false} onReset={vi.fn()} />);
    expect(screen.getByText(/24 productos en tu base/)).toBeInTheDocument();
  });

  it('renderea el contador en singular cuando hay 1 producto', () => {
    render(<ChatHeader productsInBase={1} hasMessages={false} onReset={vi.fn()} />);
    expect(screen.getByText(/1 producto en tu base/)).toBeInTheDocument();
  });

  it('botón "Nueva conversación" disabled cuando no hay mensajes', () => {
    render(<ChatHeader productsInBase={5} hasMessages={false} onReset={vi.fn()} />);
    expect(screen.getByTestId('chat-new-conversation')).toBeDisabled();
  });

  it('botón "Nueva conversación" habilitado cuando hay mensajes (US-27 §3)', () => {
    render(<ChatHeader productsInBase={5} hasMessages onReset={vi.fn()} />);
    expect(screen.getByTestId('chat-new-conversation')).not.toBeDisabled();
  });

  it('clickear "Nueva conversación" dispara onReset (US-27 §3)', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<ChatHeader productsInBase={5} hasMessages onReset={onReset} />);
    await user.click(screen.getByTestId('chat-new-conversation'));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
