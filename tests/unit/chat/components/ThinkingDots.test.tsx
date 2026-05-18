import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThinkingDots } from '@/components/chat/ThinkingDots';

describe('<ThinkingDots>', () => {
  it('renderea con role="status" y label accesible', () => {
    render(<ThinkingDots />);
    const status = screen.getByRole('status');
    expect(status).toHaveAccessibleName('Pensando...');
  });
});
