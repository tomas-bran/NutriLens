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

  it('each step has a "Paso N" label', () => {
    render(<HowItWorks />);
    expect(screen.getByText('Paso 1')).toBeInTheDocument();
    expect(screen.getByText('Paso 2')).toBeInTheDocument();
    expect(screen.getByText('Paso 3')).toBeInTheDocument();
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
