/**
 * Tests integration del page client del chat — el reducer + el cableado al
 * `fetchImpl` mockeado. Cubre los AC end-to-end del flujo:
 *
 *   - US-27 §1: input → user → thinking → respuesta.
 *   - US-27 §2: mensajes previos siguen visibles tras la 2da pregunta.
 *   - US-27 §3: "Nueva conversación" limpia el thread.
 *   - US-30 §1+§2: fallback no_context muestra CTA "Analizar nuevo producto".
 *   - §9.4: estado ERROR + retry último mensaje.
 *   - §9.5: clickear una sugerencia dispara el flujo completo.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@schemas/errors';
import { ChatPageClient } from '@/app/chat/ChatPageClient';
import type { ChatApiResponse } from '@/lib/chat/response';

const ANSWER_OK: ChatApiResponse = {
  answer: 'Tenés 1 galletita guardada.',
  products: [
    {
      id: 'p1',
      nombre: 'Galletitas Sin TACC X',
      categoria: 'galletitas',
      riesgo: 'bajo',
      imagenUrl: '/uploads/x.jpg',
    },
  ],
  intent: {
    kind: 'filter',
    categoria: 'galletitas',
    riesgo_max: null,
    apto: 'celiaco',
    alergeno_excluido: null,
    keywords: [],
    comparar: [],
  },
  tokensUsed: { in: 80, out: 22 },
  fallback: null,
};

const ANSWER_EMPTY: ChatApiResponse = {
  answer: 'No tengo productos guardados que respondan a esa pregunta.',
  products: [],
  intent: {
    kind: 'filter',
    categoria: 'galletitas',
    riesgo_max: null,
    apto: null,
    alergeno_excluido: null,
    keywords: [],
    comparar: [],
  },
  tokensUsed: { in: 50, out: 10 },
  fallback: { answer: 'irrelevant', reason: 'no_context', showAnalyzeCta: true },
};

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('<ChatPageClient> — flujo happy (US-27 §1 + US-29 §1)', () => {
  it('envío de pregunta → user bubble → respuesta del asistente con chip', async () => {
    const user = userEvent.setup();
    const fetchImpl = vi.fn().mockResolvedValue(ANSWER_OK);

    render(<ChatPageClient productsInBase={5} historialCount={5} fetchImpl={fetchImpl} />);

    // Estado inicial: hero visible, sin thread.
    expect(screen.getByTestId('chat-hero')).toBeInTheDocument();

    // Escribo y envío.
    await user.type(screen.getByTestId('chat-input'), 'mostrame galletitas{Enter}');

    // Llega la respuesta (la transición a THINKING está cubierta en el último
    // test del suite con un deferred promise; acá solo verificamos el resultado).
    await waitFor(() => {
      expect(screen.getByTestId('chat-assistant-bubble')).toHaveTextContent(
        'Tenés 1 galletita guardada.',
      );
    });
    expect(screen.getByTestId('chat-user-bubble')).toHaveTextContent('mostrame galletitas');
    expect(screen.queryByTestId('chat-thinking')).not.toBeInTheDocument();
    // El chip referenciado aparece (US-32 §1).
    expect(screen.getByTestId('chat-product-chip')).toBeInTheDocument();
  });

  it('mantiene mensajes previos al hacer una 2da pregunta (US-27 §2)', async () => {
    const user = userEvent.setup();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(ANSWER_OK)
      .mockResolvedValueOnce({
        ...ANSWER_OK,
        answer: 'Segunda respuesta.',
        products: [],
      });

    render(<ChatPageClient productsInBase={5} historialCount={5} fetchImpl={fetchImpl} />);

    await user.type(screen.getByTestId('chat-input'), 'primera{Enter}');
    await waitFor(() =>
      expect(screen.getByTestId('chat-assistant-bubble')).toHaveTextContent('Tenés 1 galletita'),
    );

    await user.type(screen.getByTestId('chat-input'), 'segunda{Enter}');
    await waitFor(() =>
      expect(
        screen.getByText((c) => c.includes('Segunda respuesta')),
      ).toBeInTheDocument(),
    );

    // Las 2 user bubbles y las 2 respuestas siguen visibles.
    const userBubbles = screen.getAllByTestId('chat-user-bubble');
    const botBubbles = screen.getAllByTestId('chat-assistant-bubble');
    expect(userBubbles).toHaveLength(2);
    expect(botBubbles).toHaveLength(2);
  });
});

describe('<ChatPageClient> — reset (US-27 §3)', () => {
  it('"Nueva conversación" limpia el thread y vuelve al hero', async () => {
    const user = userEvent.setup();
    const fetchImpl = vi.fn().mockResolvedValue(ANSWER_OK);
    render(<ChatPageClient productsInBase={5} historialCount={5} fetchImpl={fetchImpl} />);

    await user.type(screen.getByTestId('chat-input'), 'pregunta 1{Enter}');
    await waitFor(() => expect(screen.getByTestId('chat-assistant-bubble')).toBeInTheDocument());

    await user.click(screen.getByTestId('chat-new-conversation'));

    expect(screen.queryByTestId('chat-user-bubble')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chat-assistant-bubble')).not.toBeInTheDocument();
    expect(screen.getByTestId('chat-hero')).toBeInTheDocument();
  });
});

describe('<ChatPageClient> — sugerencias (spec §9.5)', () => {
  it('clickear una sugerencia dispara el flujo de envío', async () => {
    const user = userEvent.setup();
    const fetchImpl = vi.fn().mockResolvedValue(ANSWER_OK);
    render(<ChatPageClient productsInBase={5} historialCount={5} fetchImpl={fetchImpl} />);

    await user.click(screen.getAllByTestId('chat-suggestion')[0]!);

    await waitFor(() => expect(fetchImpl).toHaveBeenCalledOnce());
    expect(fetchImpl).toHaveBeenCalledWith('Mostrame productos aptos para celíacos');
    await waitFor(() => expect(screen.getByTestId('chat-assistant-bubble')).toBeInTheDocument());
  });
});

describe('<ChatPageClient> — fallback no_context (US-30 §1+§2)', () => {
  it('muestra mensaje + CTA "Analizar nuevo producto" cuando fallback.showAnalyzeCta=true', async () => {
    const user = userEvent.setup();
    const fetchImpl = vi.fn().mockResolvedValue(ANSWER_EMPTY);

    render(<ChatPageClient productsInBase={0} historialCount={0} fetchImpl={fetchImpl} />);

    await user.type(screen.getByTestId('chat-input'), 'mostrame snacks{Enter}');

    await waitFor(() =>
      expect(screen.getByTestId('chat-assistant-bubble')).toHaveTextContent(
        'No tengo productos guardados',
      ),
    );
    const cta = screen.getByTestId('chat-analyze-cta');
    expect(cta).toBeInTheDocument();
    expect(cta.getAttribute('href')).toBe('/analizar');
    // Sin chips porque products=[].
    expect(screen.queryByTestId('chat-product-chip')).not.toBeInTheDocument();
  });
});

describe('<ChatPageClient> — estado ERROR (spec §9.4)', () => {
  it('error del backend → ChatErrorBanner con retry; retry reenvía la última pregunta', async () => {
    const user = userEvent.setup();
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('model_rate_limited', 'Saturado, probá en un rato.', 429))
      .mockResolvedValueOnce(ANSWER_OK);

    render(<ChatPageClient productsInBase={3} historialCount={3} fetchImpl={fetchImpl} />);

    await user.type(screen.getByTestId('chat-input'), 'mostrame galletitas{Enter}');

    await waitFor(() => expect(screen.getByTestId('chat-error')).toBeInTheDocument());
    expect(screen.getByTestId('chat-error')).toHaveTextContent('Saturado');

    await user.click(screen.getByTestId('chat-retry'));

    await waitFor(() =>
      expect(screen.getByTestId('chat-assistant-bubble')).toBeInTheDocument(),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // Segunda call con la misma pregunta.
    expect(fetchImpl).toHaveBeenNthCalledWith(2, 'mostrame galletitas');
  });

  it('error genérico (no ApiError) → mensaje fallback "Algo salió mal"', async () => {
    const user = userEvent.setup();
    const fetchImpl = vi.fn().mockRejectedValue(new Error('boom'));

    render(<ChatPageClient productsInBase={3} historialCount={3} fetchImpl={fetchImpl} />);

    await user.type(screen.getByTestId('chat-input'), 'algo{Enter}');
    await waitFor(() => expect(screen.getByTestId('chat-error')).toBeInTheDocument());
    expect(screen.getByTestId('chat-error')).toHaveTextContent(/Algo salió mal/);
  });
});

describe('<ChatPageClient> — input bloqueado en THINKING', () => {
  it('mientras la respuesta no llega, el input + send quedan disabled', async () => {
    const user = userEvent.setup();
    let resolveFetch: ((v: ChatApiResponse) => void) | null = null;
    const fetchImpl = vi.fn().mockImplementation(
      () =>
        new Promise<ChatApiResponse>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(<ChatPageClient productsInBase={3} historialCount={3} fetchImpl={fetchImpl} />);

    await user.type(screen.getByTestId('chat-input'), 'q{Enter}');

    expect(screen.getByTestId('chat-input')).toBeDisabled();
    expect(screen.getByTestId('chat-send')).toBeDisabled();

    resolveFetch!(ANSWER_OK);
    await waitFor(() => expect(screen.queryByTestId('chat-thinking')).not.toBeInTheDocument());
    expect(screen.getByTestId('chat-input')).not.toBeDisabled();
  });
});
