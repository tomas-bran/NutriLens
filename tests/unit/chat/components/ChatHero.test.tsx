import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatHero } from '@/components/chat/ChatHero';
import { CHAT_SUGGESTIONS } from '@/components/chat/types';

describe('<ChatHero> — sugerencias iniciales (spec §9.5)', () => {
  it('muestra el copy del hero', () => {
    render(<ChatHero onPick={vi.fn()} />);
    expect(screen.getByText('Preguntame sobre tus productos')).toBeInTheDocument();
    expect(screen.getByText(/Respondo usando los productos/)).toBeInTheDocument();
  });

  it('lista las 4 sugerencias canónicas', () => {
    render(<ChatHero onPick={vi.fn()} />);
    const rows = screen.getAllByTestId('chat-suggestion');
    expect(rows).toHaveLength(CHAT_SUGGESTIONS.length);
    for (const s of CHAT_SUGGESTIONS) {
      expect(screen.getByText(s)).toBeInTheDocument();
    }
  });

  it('clickear una sugerencia llama onPick con el texto exacto', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<ChatHero onPick={onPick} />);
    const first = screen.getAllByTestId('chat-suggestion')[0]!;
    await user.click(first);
    expect(onPick).toHaveBeenCalledWith(CHAT_SUGGESTIONS[0]);
  });
});
