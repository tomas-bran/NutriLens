/**
 * Tests del <ChatThread> — orden, mezcla de roles y rendering del indicador
 * THINKING. US-27 §1+§2.
 */
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ChatThread } from '@/components/chat/ChatThread';
import type { ChatMessage } from '@/components/chat/types';

const userMsg: ChatMessage = { role: 'user', id: 'u1', text: 'mostrame galletitas' };
const botMsg: ChatMessage = {
  role: 'assistant',
  id: 'a1',
  text: 'Tenés 1 galletita guardada.',
  products: [],
  fallback: null,
};

describe('<ChatThread>', () => {
  beforeAll(() => {
    // jsdom no implementa scrollIntoView; el effect lo llama tras cada render.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('lista vacía no rompe (renderea contenedor live region)', () => {
    render(<ChatThread messages={[]} status="IDLE" />);
    expect(screen.getByTestId('chat-thread')).toBeInTheDocument();
  });

  it('renderea user bubbles y assistant bubbles en orden (US-27 §1+§2)', () => {
    render(<ChatThread messages={[userMsg, botMsg]} status="IDLE" />);
    expect(screen.getByTestId('chat-user-bubble')).toHaveTextContent('mostrame galletitas');
    expect(screen.getByTestId('chat-assistant-bubble')).toHaveTextContent(
      'Tenés 1 galletita guardada.',
    );
  });

  it('muestra ThinkingDots cuando status=THINKING', () => {
    render(<ChatThread messages={[userMsg]} status="THINKING" />);
    expect(screen.getByTestId('chat-thinking')).toBeInTheDocument();
  });

  it('no muestra ThinkingDots cuando status=IDLE', () => {
    render(<ChatThread messages={[userMsg, botMsg]} status="IDLE" />);
    expect(screen.queryByTestId('chat-thinking')).not.toBeInTheDocument();
  });

  it('no muestra ThinkingDots cuando status=ERROR', () => {
    render(<ChatThread messages={[userMsg]} status="ERROR" />);
    expect(screen.queryByTestId('chat-thinking')).not.toBeInTheDocument();
  });
});
