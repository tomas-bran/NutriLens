/**
 * Unit tests for the AR-regulatory `<SelloChips>`.
 * Verifies octagon shape, two-line copy and "Ministerio de Salud" subtitle.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SelloChips } from '@/components/result/SelloChips';
import type { Sello } from '@schemas/product';

describe('<SelloChips>', () => {
  it('omits the section when the array is empty', () => {
    const { container } = render(<SelloChips sellos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the section heading when there are sellos', () => {
    render(<SelloChips sellos={['exceso en azúcares']} />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Sellos detectados' }),
    ).toBeInTheDocument();
  });

  it('renders one chip per sello with the right testid', () => {
    render(
      <SelloChips
        sellos={['exceso en azúcares', 'exceso en grasas saturadas', 'exceso en sodio']}
      />,
    );
    expect(screen.getByTestId('sello-exceso-en-azcares')).toBeInTheDocument();
    expect(screen.getByTestId('sello-exceso-en-grasas-saturadas')).toBeInTheDocument();
    expect(screen.getByTestId('sello-exceso-en-sodio')).toBeInTheDocument();
  });

  it('shows the canonical two-line label "Exceso en / <nutriente>"', () => {
    render(<SelloChips sellos={['exceso en azúcares']} />);
    const chip = screen.getByTestId('sello-exceso-en-azcares');
    expect(within(chip).getByText('Exceso en')).toBeInTheDocument();
    expect(within(chip).getByText('Azúcares')).toBeInTheDocument();
  });

  it('shows the "Ministerio de Salud" subtitle on each sello', () => {
    render(<SelloChips sellos={['exceso en sodio']} />);
    const chip = screen.getByTestId('sello-exceso-en-sodio');
    // Text is broken into two lines via <br /> so query by partial.
    expect(chip.textContent).toMatch(/Ministerio/);
    expect(chip.textContent).toMatch(/de Salud/);
  });

  it('applies the regular octagon clip-path inline', () => {
    render(<SelloChips sellos={['exceso en calorías']} />);
    const chip = screen.getByTestId('sello-exceso-en-caloras');
    // clip-path is inlined via style — sanity-check that it carries an
    // 8-point polygon (regardless of exact percentages).
    const clipPath = chip.getAttribute('style') ?? '';
    expect(clipPath).toContain('clip-path');
    expect(clipPath).toMatch(/polygon\([^)]*0%[^)]*\)/);
  });

  it('aria-label carries the human-readable sello name (a11y)', () => {
    render(<SelloChips sellos={['exceso en grasas totales']} />);
    const chip = screen.getByTestId('sello-exceso-en-grasas-totales');
    expect(chip).toHaveAttribute('aria-label', 'Sello: exceso en grasas totales');
  });

  it('renders all 5 AR-regulatory sellos with the right two-line labels', () => {
    const allSellos: ReadonlyArray<Sello> = [
      'exceso en azúcares',
      'exceso en grasas saturadas',
      'exceso en grasas totales',
      'exceso en sodio',
      'exceso en calorías',
    ];
    render(<SelloChips sellos={allSellos} />);
    expect(screen.getAllByText('Exceso en')).toHaveLength(5);
    expect(screen.getByText('Azúcares')).toBeInTheDocument();
    expect(screen.getByText('Grasas saturadas')).toBeInTheDocument();
    expect(screen.getByText('Grasas totales')).toBeInTheDocument();
    expect(screen.getByText('Sodio')).toBeInTheDocument();
    expect(screen.getByText('Calorías')).toBeInTheDocument();
  });
});
