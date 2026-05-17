/**
 * Unit tests for <ResultView> — covers the §6.1 layout against products of
 * each risk level, plus low-confidence + edge cases (no allergens, no sellos,
 * no explanation).
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultView } from '@/components/result/ResultView';
import type { ProductDetail } from '@/lib/products/serializers';

function mkProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Choco Crunch 200g',
    categoria: 'galletitas',
    riesgo: 'alto',
    confidence: 0.94,
    alergenos: ['gluten', 'leche'],
    sellos: ['exceso en azúcares', 'exceso en grasas saturadas'],
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: false,
    imagenUrl: '/uploads/choco-crunch.jpg',
    createdAt: '2026-05-12T10:00:00.000Z',
    ingredientes: ['harina de trigo', 'azúcar', 'aceite vegetal'],
    reglasAplicadas: [],
    explanation: 'Este producto no es recomendable para personas con celiaquía.',
    jsonRaw: '{}',
    pipelineTrace: [],
    promptVersion: 'extract_product-v1',
    ...overrides,
  };
}

describe('<ResultView> — header (§6.1)', () => {
  it('shows the back link to /analizar', () => {
    render(<ResultView product={mkProduct()} />);
    expect(screen.getByTestId('result-back')).toHaveAttribute('href', '/analizar');
  });

  it('shows category eyebrow + product name', () => {
    render(<ResultView product={mkProduct()} />);
    expect(screen.getByTestId('result-category')).toHaveTextContent('galletitas');
    expect(screen.getByTestId('result-title')).toHaveTextContent('Choco Crunch 200g');
  });

  it('shows confidence and date in the subtitle', () => {
    render(<ResultView product={mkProduct({ confidence: 0.94 })} />);
    const header = screen.getByTestId('result-header');
    expect(within(header).getByText(/Confianza 94%/)).toBeInTheDocument();
  });
});

describe('<ResultView> — risk banner (§6.2, all three levels)', () => {
  it('renders "Riesgo bajo" with the low-risk variant class', () => {
    render(<ResultView product={mkProduct({ riesgo: 'bajo' })} />);
    const banner = screen.getByTestId('risk-banner');
    expect(banner).toHaveAttribute('data-risk', 'bajo');
    expect(within(banner).getByRole('heading', { name: 'Riesgo bajo' })).toBeInTheDocument();
    expect(banner.className).toContain('risk-banner-low');
  });

  it('renders "Riesgo medio" with the medium variant class', () => {
    render(<ResultView product={mkProduct({ riesgo: 'medio' })} />);
    const banner = screen.getByTestId('risk-banner');
    expect(banner).toHaveAttribute('data-risk', 'medio');
    expect(within(banner).getByRole('heading', { name: 'Riesgo medio' })).toBeInTheDocument();
    expect(banner.className).toContain('risk-banner-medium');
  });

  it('renders "Riesgo alto" with the high variant class', () => {
    render(<ResultView product={mkProduct({ riesgo: 'alto' })} />);
    const banner = screen.getByTestId('risk-banner');
    expect(banner).toHaveAttribute('data-risk', 'alto');
    expect(within(banner).getByRole('heading', { name: 'Riesgo alto' })).toBeInTheDocument();
    expect(banner.className).toContain('risk-banner-high');
  });

  it('builds a reason line from allergens + sellos when both are present', () => {
    render(<ResultView product={mkProduct()} />);
    const banner = screen.getByTestId('risk-banner');
    expect(within(banner).getByText(/alérgenos: gluten, leche/)).toBeInTheDocument();
    expect(within(banner).getByText(/2 sellos/)).toBeInTheDocument();
  });

  it('omits the reason line when there are no allergens nor sellos', () => {
    render(<ResultView product={mkProduct({ alergenos: [], sellos: [], riesgo: 'bajo' })} />);
    const banner = screen.getByTestId('risk-banner');
    expect(within(banner).queryByText(/Por /)).not.toBeInTheDocument();
  });
});

describe('<ResultView> — low confidence banner (§6.3, US-20)', () => {
  it('appears when confidence < 0.6', () => {
    render(<ResultView product={mkProduct({ confidence: 0.4 })} />);
    expect(screen.getByTestId('low-confidence-banner')).toBeInTheDocument();
    expect(screen.getByText('Confianza baja')).toBeInTheDocument();
  });

  it('appears at exactly 0.59 (just below threshold)', () => {
    render(<ResultView product={mkProduct({ confidence: 0.59 })} />);
    expect(screen.getByTestId('low-confidence-banner')).toBeInTheDocument();
  });

  it('does NOT appear at exactly 0.6 (threshold)', () => {
    render(<ResultView product={mkProduct({ confidence: 0.6 })} />);
    expect(screen.queryByTestId('low-confidence-banner')).not.toBeInTheDocument();
  });

  it('does NOT appear with high confidence', () => {
    render(<ResultView product={mkProduct({ confidence: 0.94 })} />);
    expect(screen.queryByTestId('low-confidence-banner')).not.toBeInTheDocument();
  });
});

describe('<ResultView> — aptitudes chips', () => {
  it('renders three chips, one per aptitude', () => {
    render(<ResultView product={mkProduct()} />);
    expect(screen.getByTestId('aptitude-vegano')).toBeInTheDocument();
    expect(screen.getByTestId('aptitude-celiaco')).toBeInTheDocument();
    expect(screen.getByTestId('aptitude-sin_lactosa')).toBeInTheDocument();
  });

  it('shows the "No apto" copy when apto* fields are false', () => {
    render(<ResultView product={mkProduct()} />);
    expect(screen.getByTestId('aptitude-vegano')).toHaveAttribute('data-apto', 'false');
    expect(screen.getByTestId('aptitude-vegano')).toHaveTextContent('No vegano');
    expect(screen.getByTestId('aptitude-celiaco')).toHaveTextContent('No apto celíaco');
    expect(screen.getByTestId('aptitude-sin_lactosa')).toHaveTextContent('Tiene lactosa');
  });

  it('shows the "Apto" copy when apto* fields are true', () => {
    render(
      <ResultView
        product={mkProduct({ aptoVegano: true, aptoCeliaco: true, aptoSinLactosa: true })}
      />,
    );
    expect(screen.getByTestId('aptitude-vegano')).toHaveAttribute('data-apto', 'true');
    expect(screen.getByTestId('aptitude-vegano')).toHaveTextContent('Vegano');
    expect(screen.getByTestId('aptitude-celiaco')).toHaveTextContent('Apto celíaco');
    expect(screen.getByTestId('aptitude-sin_lactosa')).toHaveTextContent('Sin lactosa');
  });
});

describe('<ResultView> — explanation card', () => {
  it('renders the explanation when present', () => {
    render(<ResultView product={mkProduct()} />);
    const card = screen.getByTestId('explanation-card');
    expect(within(card).getByText(/Este producto no es recomendable/)).toBeInTheDocument();
  });

  it('is omitted when explanation is null', () => {
    render(<ResultView product={mkProduct({ explanation: null })} />);
    expect(screen.queryByTestId('explanation-card')).not.toBeInTheDocument();
  });
});

describe('<ResultView> — allergens, sellos, ingredients', () => {
  it('renders one chip per allergen', () => {
    render(<ResultView product={mkProduct()} />);
    expect(screen.getByTestId('allergen-gluten')).toBeInTheDocument();
    expect(screen.getByTestId('allergen-leche')).toBeInTheDocument();
  });

  it('omits the allergen section when the array is empty', () => {
    render(<ResultView product={mkProduct({ alergenos: [] })} />);
    expect(screen.queryByTestId('allergen-chips')).not.toBeInTheDocument();
  });

  it('renders one chip per sello', () => {
    render(<ResultView product={mkProduct()} />);
    expect(screen.getByTestId('sello-chips')).toBeInTheDocument();
    expect(within(screen.getByTestId('sello-chips')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('omits the sellos section when the array is empty', () => {
    render(<ResultView product={mkProduct({ sellos: [] })} />);
    expect(screen.queryByTestId('sello-chips')).not.toBeInTheDocument();
  });

  it('renders one li per ingredient', () => {
    render(<ResultView product={mkProduct()} />);
    const list = screen.getByTestId('ingredient-list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('omits the ingredients section when the array is empty', () => {
    render(<ResultView product={mkProduct({ ingredientes: [] })} />);
    expect(screen.queryByTestId('ingredient-list')).not.toBeInTheDocument();
  });
});

describe('<ResultView> — disclaimer footer (§6.4, US-19)', () => {
  it('renders the disclaimer at the bottom', () => {
    render(<ResultView product={mkProduct()} />);
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent(/NutriLens es un asistente informativo/);
  });
});

describe('<ResultView> — product image + confidence pill', () => {
  it('renders the image when imagenUrl is set', () => {
    render(<ResultView product={mkProduct({ imagenUrl: '/uploads/foo.jpg' })} />);
    const card = screen.getByTestId('product-image-card');
    const img = within(card).queryByRole('img');
    expect(img).not.toBeNull();
  });

  it('renders the confidence pill rounded to the nearest percent', () => {
    render(<ResultView product={mkProduct({ confidence: 0.876 })} />);
    expect(screen.getByTestId('confidence-pill')).toHaveTextContent('Confianza 88%');
  });
});
