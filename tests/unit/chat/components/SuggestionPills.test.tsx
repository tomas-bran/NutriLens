import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SuggestionPills } from '@/components/chat/SuggestionPills';
import { CHAT_SUGGESTIONS } from '@/components/chat/types';

describe('<SuggestionPills>', () => {
  it('renders a pill for each suggestion', () => {
    render(<SuggestionPills onPick={vi.fn()} />);
    for (const s of CHAT_SUGGESTIONS) {
      expect(screen.getByRole('button', { name: s })).toBeInTheDocument();
    }
  });

  it('calls onPick with the suggestion text when a pill is clicked', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<SuggestionPills onPick={onPick} />);
    await user.click(screen.getByRole('button', { name: CHAT_SUGGESTIONS[0] }));
    expect(onPick).toHaveBeenCalledWith(CHAT_SUGGESTIONS[0]);
  });

  it('excludes the lastQuestion pill (exact match)', () => {
    render(<SuggestionPills onPick={vi.fn()} lastQuestion={CHAT_SUGGESTIONS[1]} />);
    expect(screen.queryByRole('button', { name: CHAT_SUGGESTIONS[1] })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: CHAT_SUGGESTIONS[0] })).toBeInTheDocument();
  });

  it('excludes lastQuestion case-insensitively', () => {
    const first = CHAT_SUGGESTIONS[0] ?? '';
    render(<SuggestionPills onPick={vi.fn()} lastQuestion={first.toUpperCase()} />);
    expect(screen.queryByRole('button', { name: first })).not.toBeInTheDocument();
  });

  it('renders N-1 pills when one suggestion matches lastQuestion', () => {
    const first = CHAT_SUGGESTIONS[0];
    const { container } = render(<SuggestionPills onPick={vi.fn()} lastQuestion={first} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(CHAT_SUGGESTIONS.length - 1);
  });

  it('has the suggestion-pills testid for E2E targeting', () => {
    render(<SuggestionPills onPick={vi.fn()} />);
    expect(screen.getByTestId('suggestion-pills')).toBeInTheDocument();
  });

  it('has accessible aria-label on the container', () => {
    render(<SuggestionPills onPick={vi.fn()} />);
    const container = screen.getByTestId('suggestion-pills');
    expect(container).toHaveAttribute('aria-label', 'Sugerencias de preguntas');
  });
});
