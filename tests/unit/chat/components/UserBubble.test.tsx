import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserBubble } from '@/components/chat/UserBubble';

describe('<UserBubble>', () => {
  it('renderea el texto del usuario', () => {
    render(<UserBubble text="hola mundo" />);
    expect(screen.getByTestId('chat-user-bubble')).toHaveTextContent('hola mundo');
  });

  it('queda alineado a la derecha (clase justify-end en el wrapper)', () => {
    const { container } = render(<UserBubble text="x" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('justify-end');
  });
});
