import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton } from '@/components/ui/Skeleton';

describe('Skeleton', () => {
  it('renders as a div', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('is aria-hidden (decorative loader)', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('has role=presentation', () => {
    render(<Skeleton />);
    expect(screen.getByRole('presentation', { hidden: true })).toBeInTheDocument();
  });

  it('applies animate-pulse', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('applies width via style prop', () => {
    const { container } = render(<Skeleton width="200px" />);
    expect(container.firstChild).toHaveStyle({ width: '200px' });
  });

  it('applies height via style prop', () => {
    const { container } = render(<Skeleton height="40px" />);
    expect(container.firstChild).toHaveStyle({ height: '40px' });
  });

  it('applies width and height together', () => {
    const { container } = render(<Skeleton width="100%" height="20px" />);
    expect(container.firstChild).toHaveStyle({ width: '100%', height: '20px' });
  });

  it('forwards className', () => {
    const { container } = render(<Skeleton className="mt-2" />);
    expect(container.firstChild).toHaveClass('mt-2');
  });

  it('forwards extra HTML attributes', () => {
    render(<Skeleton data-testid="sk-1" />);
    expect(screen.getByTestId('sk-1')).toBeInTheDocument();
  });

  it('has rounded-md shape', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('rounded-md');
  });

  it('merges style prop with width/height', () => {
    const { container } = render(<Skeleton width="50px" height="50px" style={{ opacity: 0.5 }} />);
    expect(container.firstChild).toHaveStyle({ width: '50px', height: '50px', opacity: '0.5' });
  });
});
