/**
 * Unit tests for <AllergenList>.
 * Verifies per-allergen icon mapping (gluten→wheat, leche→milk, etc.) plus
 * graceful fallback for unknown values.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AllergenList } from '@/components/result/AllergenList';

describe('<AllergenList>', () => {
  it('omits the section when no allergens are passed', () => {
    const { container } = render(<AllergenList allergens={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one chip per allergen with the right label', () => {
    render(<AllergenList allergens={['gluten', 'leche']} />);
    expect(screen.getByTestId('allergen-gluten')).toHaveTextContent('Gluten');
    expect(screen.getByTestId('allergen-leche')).toHaveTextContent('Leche');
  });

  it('maps each known allergen to its specific glyph', () => {
    const cases: Array<[string, string]> = [
      ['gluten', 'wheat'],
      ['leche', 'milk'],
      ['lactosa', 'milk'],
      ['huevo', 'egg'],
      ['soja', 'soy'],
      ['pescado', 'fish'],
      ['crustáceos', 'shrimp'],
      ['frutos secos', 'nut'],
      ['maní', 'nut'],
    ];
    for (const [name, expectedIcon] of cases) {
      const { unmount } = render(<AllergenList allergens={[name]} />);
      const chip = screen.getByTestId(
        `allergen-${name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')}`,
      );
      expect(chip).toHaveAttribute('data-icon', expectedIcon);
      unmount();
    }
  });

  it('falls back to the generic allergen icon for unmapped values', () => {
    render(<AllergenList allergens={['sulfitos', 'sésamo', 'desconocido']} />);
    expect(screen.getByTestId('allergen-sulfitos')).toHaveAttribute('data-icon', 'allergen');
    expect(screen.getByTestId('allergen-ssamo')).toHaveAttribute('data-icon', 'allergen');
    expect(screen.getByTestId('allergen-desconocido')).toHaveAttribute('data-icon', 'allergen');
  });

  it('is case-insensitive when matching the icon', () => {
    render(<AllergenList allergens={['Gluten', 'LECHE']} />);
    expect(screen.getByTestId('allergen-gluten')).toHaveAttribute('data-icon', 'wheat');
    expect(screen.getByTestId('allergen-leche')).toHaveAttribute('data-icon', 'milk');
  });
});
