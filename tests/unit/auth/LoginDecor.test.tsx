import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoginDecor } from '@/components/auth/LoginDecor';

describe('<LoginDecor> — decoración del panel de marca del login', () => {
  it('es decorativa (aria-hidden) y renderiza estrellitas + scan-frame', () => {
    const { container } = render(<LoginDecor />);
    const root = container.querySelector('[aria-hidden="true"]');
    expect(root).not.toBeNull();
    // estrellitas (svgs de sparkle) + el ícono del QR del scan-frame.
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(4);
  });
});
