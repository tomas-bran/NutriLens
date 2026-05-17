import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Contenido</Card>);
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('has border and shadow classes', () => {
    const { container } = render(<Card>x</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('shadow-sm');
    expect(card).toHaveClass('rounded-lg');
  });

  it('default padding is md (p-4)', () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('padding none removes padding', () => {
    const { container } = render(<Card padding="none">x</Card>);
    expect(container.firstChild).not.toHaveClass('p-4');
    expect(container.firstChild).not.toHaveClass('p-3');
    expect(container.firstChild).not.toHaveClass('p-6');
  });

  it('padding sm applies p-3', () => {
    const { container } = render(<Card padding="sm">x</Card>);
    expect(container.firstChild).toHaveClass('p-3');
  });

  it('padding lg applies p-6', () => {
    const { container } = render(<Card padding="lg">x</Card>);
    expect(container.firstChild).toHaveClass('p-6');
  });

  it('forwards className', () => {
    const { container } = render(<Card className="extra">x</Card>);
    expect(container.firstChild).toHaveClass('extra');
  });

  it('forwards extra HTML attributes', () => {
    render(<Card data-testid="card-1">x</Card>);
    expect(screen.getByTestId('card-1')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <Card>
        <span>A</span>
        <span>B</span>
      </Card>,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
