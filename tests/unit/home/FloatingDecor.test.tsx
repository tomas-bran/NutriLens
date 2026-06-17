import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FloatingDecor } from '@/components/home/FloatingDecor';

describe('<FloatingDecor> — capa decorativa del hero', () => {
  it('es decorativa (aria-hidden) y no rompe al renderizar', () => {
    const { container } = render(<FloatingDecor />);
    const root = container.querySelector('[aria-hidden="true"]');
    expect(root).not.toBeNull();
  });

  it('pinta el halo y varias estrellitas (svgs de sparkles)', () => {
    const { container } = render(<FloatingDecor />);
    // El halo + las estrellitas: debe haber al menos un puñado de svgs.
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(4);
  });
});
