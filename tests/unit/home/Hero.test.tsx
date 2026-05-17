import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '@/components/home/Hero';

describe('<Hero>', () => {
  it('renders the h1 with the brand line', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Entendé qué comés, en segundos\./i }),
    ).toBeInTheDocument();
  });

  it('shows the brand wordmark above the title', () => {
    render(<Hero />);
    expect(screen.getByText('NutriLens')).toBeInTheDocument();
  });

  it('renders a 1-line subtitle mentioning alérgenos, sellos y riesgo (US-07 §AC1)', () => {
    render(<Hero />);
    expect(screen.getByText(/alérgenos, sellos y riesgo/i)).toBeInTheDocument();
  });

  it('exposes the primary CTA as a link to /analizar', () => {
    render(<Hero />);
    const cta = screen.getByTestId('hero-cta');
    expect(cta).toHaveAttribute('href', '/analizar');
    expect(cta).toHaveTextContent('Analizar producto');
  });

  it('the section is labelled by its heading for assistive tech', () => {
    render(<Hero />);
    const section = screen.getByRole('region', { name: /Entendé qué comés/i });
    expect(section).toBeInTheDocument();
  });
});
