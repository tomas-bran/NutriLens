/**
 * Tests del <AssistantBubble> — cubre US-29 §1 (texto), US-32 §1+§3 (chips
 * visibles/ocultos) y US-30 §2 (CTA "Analizar nuevo producto").
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssistantBubble } from '@/components/chat/AssistantBubble';
import type { ChatProductRef } from '@/lib/chat/response';
import type { ChatFallback } from '@/lib/chat/empty-response';

const SAMPLE_PRODUCT: ChatProductRef = {
  id: 'p1',
  nombre: 'Galletitas X',
  categoria: 'galletitas',
  riesgo: 'bajo',
  imagenUrl: '/x.jpg',
};

const NO_CONTEXT: ChatFallback = {
  answer: 'No tengo productos...',
  reason: 'no_context',
  showAnalyzeCta: true,
};

const UNKNOWN: ChatFallback = {
  answer: 'No te entendí...',
  reason: 'unknown_intent',
  showAnalyzeCta: false,
};

describe('<AssistantBubble>', () => {
  it('muestra el texto del modelo', () => {
    render(<AssistantBubble text="Tenés 2 galletitas guardadas." products={[]} fallback={null} />);
    expect(screen.getByTestId('chat-assistant-bubble')).toHaveTextContent(
      'Tenés 2 galletitas guardadas.',
    );
  });

  it('lista los chips de productos cuando hay contexto (US-32 §1)', () => {
    render(
      <AssistantBubble
        text="..."
        products={[SAMPLE_PRODUCT, { ...SAMPLE_PRODUCT, id: 'p2', nombre: 'Galletitas Y' }]}
        fallback={null}
      />,
    );
    const list = screen.getByTestId('chat-products-list');
    expect(list).toBeInTheDocument();
    expect(screen.getAllByTestId('chat-product-chip')).toHaveLength(2);
    expect(screen.getByText('Galletitas X')).toBeInTheDocument();
    expect(screen.getByText('Galletitas Y')).toBeInTheDocument();
  });

  it('oculta la sección de chips cuando products = [] (US-32 §3)', () => {
    render(<AssistantBubble text="..." products={[]} fallback={null} />);
    expect(screen.queryByTestId('chat-products-list')).not.toBeInTheDocument();
  });

  it('muestra el CTA "Analizar nuevo producto" cuando fallback.showAnalyzeCta=true (US-30 §2)', () => {
    render(<AssistantBubble text="..." products={[]} fallback={NO_CONTEXT} />);
    const cta = screen.getByTestId('chat-analyze-cta');
    expect(cta).toBeInTheDocument();
    expect(cta.getAttribute('href')).toBe('/analizar');
    expect(cta).toHaveTextContent('Analizar nuevo producto');
  });

  it('NO muestra CTA cuando el fallback es unknown_intent (E05 §8)', () => {
    render(<AssistantBubble text="..." products={[]} fallback={UNKNOWN} />);
    expect(screen.queryByTestId('chat-analyze-cta')).not.toBeInTheDocument();
  });

  it('NO muestra CTA en respuesta normal con contexto', () => {
    render(<AssistantBubble text="..." products={[SAMPLE_PRODUCT]} fallback={null} />);
    expect(screen.queryByTestId('chat-analyze-cta')).not.toBeInTheDocument();
  });

  it('renderiza tabla markdown cuando viene una en el text (US-31)', () => {
    const md = `Acá comparamos:

| Dimensión | A    | B     |
| --------- | ---- | ----- |
| Riesgo    | bajo | medio |

Te recomiendo A.`;
    render(<AssistantBubble text={md} products={[]} fallback={null} />);
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(within(table).getByText('Dimensión')).toBeInTheDocument();
    expect(within(table).getByText('Riesgo')).toBeInTheDocument();
  });

  it('texto plano se renderiza sin <table> (no rompemos US-29 §1)', () => {
    render(
      <AssistantBubble
        text="Tenés galletitas guardadas. NutriLens es informativo."
        products={[]}
        fallback={null}
      />,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByTestId('chat-assistant-bubble')).toHaveTextContent('Tenés galletitas');
  });
});
