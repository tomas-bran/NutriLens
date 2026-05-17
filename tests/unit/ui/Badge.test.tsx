import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Alto</Badge>);
    expect(screen.getByText('Alto')).toBeInTheDocument();
  });

  it('default variant is neutral', () => {
    const { container } = render(<Badge>Neutral</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('bg-[var(--color-surface)]');
  });

  it('variant risk-low applies green colors', () => {
    const { container } = render(<Badge variant="risk-low">Bajo</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-[var(--color-risk-low)]');
    expect(badge.className).toContain('bg-[var(--color-risk-low-bg)]');
  });

  it('variant risk-medium applies warning colors', () => {
    const { container } = render(<Badge variant="risk-medium">Medio</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-[var(--color-risk-medium)]');
    expect(badge.className).toContain('bg-[var(--color-risk-medium-bg)]');
  });

  it('variant risk-high applies danger colors', () => {
    const { container } = render(<Badge variant="risk-high">Alto</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-[var(--color-risk-high)]');
    expect(badge.className).toContain('bg-[var(--color-risk-high-bg)]');
  });

  it('risk variants show a dot indicator', () => {
    const { container } = render(<Badge variant="risk-high">Alto</Badge>);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('rounded-full');
  });

  it('neutral variant does not show a dot', () => {
    const { container } = render(<Badge variant="neutral">Categoria</Badge>);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).not.toBeInTheDocument();
  });

  it('has pill shape (rounded-full)', () => {
    const { container } = render(<Badge>x</Badge>);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('forwards className', () => {
    const { container } = render(<Badge className="my-class">x</Badge>);
    expect(container.firstChild).toHaveClass('my-class');
  });

  it('risk-low dot uses success color', () => {
    const { container } = render(<Badge variant="risk-low">Bajo</Badge>);
    const dot = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).toContain('bg-[var(--color-risk-low)]');
  });

  it('risk-medium dot uses warning color', () => {
    const { container } = render(<Badge variant="risk-medium">Medio</Badge>);
    const dot = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).toContain('bg-[var(--color-risk-medium)]');
  });

  it('risk-high dot uses danger color', () => {
    const { container } = render(<Badge variant="risk-high">Alto</Badge>);
    const dot = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.className).toContain('bg-[var(--color-risk-high)]');
  });
});
