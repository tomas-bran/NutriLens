import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Disclaimer } from '@/components/ui/Disclaimer';

describe('Disclaimer', () => {
  it('renders the disclaimer text', () => {
    render(<Disclaimer />);
    expect(screen.getByRole('note')).toBeInTheDocument();
  });

  it('mentions NutriLens', () => {
    render(<Disclaimer />);
    expect(screen.getByRole('note').textContent).toContain('NutriLens');
  });

  it('mentions "asistente informativo"', () => {
    render(<Disclaimer />);
    expect(screen.getByRole('note').textContent).toContain('asistente informativo');
  });

  it('renders as a paragraph element', () => {
    render(<Disclaimer />);
    const el = screen.getByRole('note');
    expect(el.tagName.toLowerCase()).toBe('p');
  });

  it('uses muted text color', () => {
    render(<Disclaimer />);
    expect(screen.getByRole('note').className).toContain('text-[var(--color-text-muted)]');
  });

  it('text is centered', () => {
    render(<Disclaimer />);
    expect(screen.getByRole('note')).toHaveClass('text-center');
  });

  it('mentions no reemplaza el consejo profesional', () => {
    render(<Disclaimer />);
    expect(screen.getByRole('note').textContent).toContain('profesional');
  });
});
