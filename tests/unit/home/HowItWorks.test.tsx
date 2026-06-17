import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HowItWorks } from '@/components/home/HowItWorks';

describe('<HowItWorks>', () => {
  it('renders the section heading', () => {
    render(<HowItWorks />);
    expect(screen.getByRole('heading', { level: 2, name: 'Cómo funciona' })).toBeInTheDocument();
  });

  it('renders exactly 3 steps (US-07 §AC1)', () => {
    render(<HowItWorks />);
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(3);
  });

  it('each step shows its zero-padded number (01/02/03)', () => {
    render(<HowItWorks />);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('lists the canonical step titles', () => {
    render(<HowItWorks />);
    expect(screen.getByRole('heading', { level: 3, name: 'Sacá una foto' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Esperá unos segundos' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Mirá el análisis' })).toBeInTheDocument();
  });

  it('uses an <ol> for ordered steps', () => {
    const { container } = render(<HowItWorks />);
    expect(container.querySelector('ol')).toBeInTheDocument();
  });
});
