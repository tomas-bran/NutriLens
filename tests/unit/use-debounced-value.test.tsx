/**
 * Tests del hook `useDebouncedValue`.
 */
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

function Probe({ value, delay }: { value: string; delay: number }) {
  const out = useDebouncedValue(value, delay);
  return <span data-testid="probe">{out}</span>;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('al primer render devuelve el valor inicial inmediatamente', () => {
    const { getByTestId } = render(<Probe value="inicial" delay={300} />);
    expect(getByTestId('probe').textContent).toBe('inicial');
  });

  it('actualiza el valor tras `delayMs` cuando cambia el input', () => {
    const { rerender, getByTestId } = render(<Probe value="a" delay={300} />);
    rerender(<Probe value="ab" delay={300} />);
    // Antes de los 300ms sigue mostrando "a".
    expect(getByTestId('probe').textContent).toBe('a');
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(getByTestId('probe').textContent).toBe('a');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(getByTestId('probe').textContent).toBe('ab');
  });

  it('cancela el debounce anterior si cambia el valor nuevamente antes del tick', () => {
    const { rerender, getByTestId } = render(<Probe value="a" delay={300} />);
    rerender(<Probe value="ab" delay={300} />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender(<Probe value="abc" delay={300} />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Pasaron 400ms desde el primer cambio, pero el último fue hace 200ms →
    // todavía mostramos "a".
    expect(getByTestId('probe').textContent).toBe('a');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(getByTestId('probe').textContent).toBe('abc');
  });

  it('respeta cambios de `delayMs` en runtime', () => {
    const { rerender, getByTestId } = render(<Probe value="x" delay={500} />);
    rerender(<Probe value="y" delay={100} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(getByTestId('probe').textContent).toBe('y');
  });

  it('soporta tipos no-string (número, objeto)', () => {
    function NumberProbe({ value, delay }: { value: number; delay: number }) {
      const out = useDebouncedValue(value, delay);
      return <span data-testid="n">{out}</span>;
    }
    const { rerender, getByTestId } = render(<NumberProbe value={1} delay={50} />);
    rerender(<NumberProbe value={2} delay={50} />);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(getByTestId('n').textContent).toBe('2');
  });
});
