import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="Tu historial está vacío" />);
    expect(screen.getByText('Tu historial está vacío')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Vacío" description="Cuando analices productos los verás acá." />);
    expect(screen.getByText('Cuando analices productos los verás acá.')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    const { container } = render(<EmptyState title="Vacío" />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('has role=status for screen reader announcements', () => {
    render(<EmptyState title="Vacío" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live=polite', () => {
    render(<EmptyState title="Vacío" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('renders icon when provided', () => {
    render(<EmptyState title="Vacío" icon="📦" />);
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('does not render icon wrapper when icon is omitted', () => {
    const { container } = render(<EmptyState title="Vacío" />);
    const iconWrapper = container.querySelector('.rounded-full');
    expect(iconWrapper).not.toBeInTheDocument();
  });

  it('renders action button with correct label', () => {
    render(
      <EmptyState title="Vacío" action={{ label: 'Analizar primer producto', onClick: vi.fn() }} />,
    );
    expect(screen.getByRole('button', { name: 'Analizar primer producto' })).toBeInTheDocument();
  });

  it('action button triggers callback on click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EmptyState title="Vacío" action={{ label: 'Analizar primer producto', onClick }} />);
    await user.click(screen.getByRole('button', { name: 'Analizar primer producto' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders no buttons when action is omitted', () => {
    render(<EmptyState title="Vacío" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('icon is aria-hidden', () => {
    const { container } = render(<EmptyState title="Vacío" icon="📦" />);
    const iconEl = container.querySelector('[aria-hidden="true"]');
    expect(iconEl).toBeInTheDocument();
  });

  it('has surface background', () => {
    const { container } = render(<EmptyState title="Vacío" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('bg-[var(--color-surface)]');
  });

  it('icon wrapper uses primary-soft background', () => {
    const { container } = render(<EmptyState title="Vacío" icon="📦" />);
    const wrapper = container.querySelector('.bg-\\[var\\(--color-primary-soft\\)\\]');
    expect(wrapper).toBeInTheDocument();
  });
});
