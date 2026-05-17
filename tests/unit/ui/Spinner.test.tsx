import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Spinner } from '@/components/ui/Spinner';

describe('Spinner', () => {
  it('has role=status for screen readers', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('default aria-label is "Cargando…"', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Cargando…');
  });

  it('custom label is used as aria-label', () => {
    render(<Spinner label="Procesando etiqueta" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Procesando etiqueta');
  });

  it('spinner element is aria-hidden', () => {
    const { container } = render(<Spinner />);
    const spinEl = container.querySelector('[aria-hidden="true"]');
    expect(spinEl).toBeInTheDocument();
  });

  it('spinner element has animate-spin class', () => {
    const { container } = render(<Spinner />);
    const spinEl = container.querySelector('[aria-hidden="true"]');
    expect(spinEl).toHaveClass('animate-spin');
  });

  it('size sm applies small dimensions', () => {
    const { container } = render(<Spinner size="sm" />);
    const spinEl = container.querySelector('[aria-hidden="true"]');
    expect(spinEl).toHaveClass('h-4');
    expect(spinEl).toHaveClass('w-4');
  });

  it('size md (default) applies medium dimensions', () => {
    const { container } = render(<Spinner />);
    const spinEl = container.querySelector('[aria-hidden="true"]');
    expect(spinEl).toHaveClass('h-6');
    expect(spinEl).toHaveClass('w-6');
  });

  it('size lg applies large dimensions', () => {
    const { container } = render(<Spinner size="lg" />);
    const spinEl = container.querySelector('[aria-hidden="true"]');
    expect(spinEl).toHaveClass('h-8');
    expect(spinEl).toHaveClass('w-8');
  });

  it('spinner is a circle (rounded-full)', () => {
    const { container } = render(<Spinner />);
    const spinEl = container.querySelector('[aria-hidden="true"]');
    expect(spinEl).toHaveClass('rounded-full');
  });
});
