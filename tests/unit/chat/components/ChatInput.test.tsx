/**
 * Tests del <ChatInput> (spec §9.2: Enter envía, Shift+Enter newline, blocked
 * cuando THINKING).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatInput } from '@/components/chat/ChatInput';

describe('<ChatInput>', () => {
  it('Enter envía el texto y limpia el campo', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} />);

    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
    await user.type(input, 'mostrame galletitas{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('mostrame galletitas');
    expect(input.value).toBe('');
  });

  it('Shift+Enter inserta newline sin disparar submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} />);

    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
    await user.type(input, 'línea 1{Shift>}{Enter}{/Shift}línea 2');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(input.value).toContain('\n');
  });

  it('click en el botón send envía el texto', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} />);

    await user.type(screen.getByTestId('chat-input'), 'hola');
    await user.click(screen.getByTestId('chat-send'));

    expect(onSubmit).toHaveBeenCalledWith('hola');
  });

  it('no permite submit con texto vacío o solo whitespace', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} />);

    // Botón está disabled cuando el textarea está vacío
    expect(screen.getByTestId('chat-send')).toBeDisabled();

    await user.type(screen.getByTestId('chat-input'), '   ');
    // Sigue disabled porque trim() es vacío
    expect(screen.getByTestId('chat-send')).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disabled=true deshabilita el textarea y el botón (estado THINKING)', () => {
    render(<ChatInput onSubmit={vi.fn()} disabled />);
    expect(screen.getByTestId('chat-input')).toBeDisabled();
    expect(screen.getByTestId('chat-send')).toBeDisabled();
  });

  it('Enter mientras disabled NO dispara submit (estado THINKING)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} initialValue="hola" disabled />);
    const input = screen.getByTestId('chat-input');
    await user.click(input);
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('trimea el texto antes de submitear', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} />);
    await user.type(screen.getByTestId('chat-input'), '  hola  {Enter}');
    expect(onSubmit).toHaveBeenCalledWith('hola');
  });

  it('placeholder y aria-label visibles para accesibilidad', () => {
    render(<ChatInput onSubmit={vi.fn()} />);
    const input = screen.getByTestId('chat-input');
    expect(input.getAttribute('placeholder')).toContain('Preguntá');
    expect(input.getAttribute('aria-label')).toContain('pregunta');
  });
});
