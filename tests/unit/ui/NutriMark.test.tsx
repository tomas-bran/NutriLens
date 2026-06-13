import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NutriMark } from '@/components/ui/NutriMark';

describe('<NutriMark> — logotipo', () => {
  it('renderiza un svg 24x24 por defecto, decorativo', () => {
    const { container } = render(<NutriMark />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('respeta el size y className', () => {
    const { container } = render(<NutriMark size={40} className="brand" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');
    expect(svg?.getAttribute('class')).toContain('brand');
  });

  it('permite variar los colores (hoja/destello)', () => {
    const { container } = render(<NutriMark leaf="#000000" spark="#111111" />);
    const fills = Array.from(container.querySelectorAll('[fill]')).map((n) =>
      n.getAttribute('fill'),
    );
    expect(fills).toContain('#000000');
    expect(fills).toContain('#111111');
  });
});
