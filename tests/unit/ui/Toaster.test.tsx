import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from '@/components/ui/Toaster';

function Trigger({
  title,
  variant = 'success' as const,
  durationMs,
}: {
  title: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  durationMs?: number;
}) {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast({ variant, title, durationMs })}>
      fire
    </button>
  );
}

describe('<ToastProvider> + useToast', () => {
  it('throws if useToast is called outside the provider', () => {
    function Outside() {
      useToast();
      return null;
    }
    // React logs the error noisily but the assertion is what matters.
    expect(() => render(<Outside />)).toThrow(/useToast must be called inside/);
  });

  it('renders a toast when showToast is invoked', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger title="Hello" />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('mounts the toaster container with aria-live=polite', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger title="x" />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'fire' }));
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('aria-live', 'polite');
  });

  it('dismisses a toast when the user clicks ×', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger title="Goodbye" durationMs={0} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByText('Goodbye')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Cerrar/i }));
    expect(screen.queryByText('Goodbye')).not.toBeInTheDocument();
  });

  it('auto-dismisses after the configured duration', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger title="Briefly" durationMs={50} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getByText('Briefly')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Briefly')).not.toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it('stacks multiple toasts in order', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger title="First" durationMs={0} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'fire' }));
    await user.click(screen.getByRole('button', { name: 'fire' }));
    expect(screen.getAllByText('First')).toHaveLength(2);
  });
});
