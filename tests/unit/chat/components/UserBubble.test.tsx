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

  it('muestra el mensaje del usuario como TEXTO PLANO, sin interpretar markdown (NL-303 AC#3)', () => {
    // El markdown del usuario NO debe renderizarse: **negrita** queda literal,
    // sin <strong>, sin <table>, sin <ul>.
    const md = '**no soy negrita** y | no | soy | tabla |';
    const { container } = render(<UserBubble text={md} />);
    const bubble = screen.getByTestId('chat-user-bubble');
    expect(bubble).toHaveTextContent('**no soy negrita**');
    expect(container.querySelector('strong')).toBeNull();
    expect(container.querySelector('table')).toBeNull();
  });
});
