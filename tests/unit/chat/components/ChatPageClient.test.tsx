/**
 * Tests integration del page client del chat — el reducer + el cableado al
 * `fetchStreamImpl` (SSE) mockeado. Cubre los AC end-to-end del flujo:
 *
 *   - US-27 §1: input → user → streaming → respuesta.
 *   - US-27 §2: mensajes previos siguen visibles tras la 2da pregunta.
 *   - US-27 §3: "Nueva conversación" limpia el thread.
 *   - US-30 §1+§2: fallback no_context muestra CTA "Analizar nuevo producto".
 *   - §9.4: estado ERROR + retry último mensaje.
 *   - §9.5: clickear una sugerencia dispara el flujo completo.
 *   - NL-304: la respuesta se construye desde eventos `delta` y se finaliza
 *     con `done` (texto sanitizado autoritativo).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ChatPageClient } from '@/app/chat/ChatPageClient';
import type { ChatProductRef } from '@/lib/chat/response';
import type { ChatFallback } from '@/lib/chat/empty-response';
import type { ChatStreamEvent } from '@/lib/chat/stream-events';
import type { fetchChatStream } from '@/lib/chat/fetch-chat-stream';
import { createConversation } from '@/lib/conversations/client';

vi.mock('@/lib/conversations/client', () => ({
  createConversation: vi.fn().mockResolvedValue({ id: 'conv-1' }),
  updateConversation: vi.fn().mockResolvedValue(undefined),
  getConversation: vi.fn().mockResolvedValue(null),
}));

const createConversationMock = vi.mocked(createConversation);

const CHIP: ChatProductRef = {
  id: 'p1',
  nombre: 'Galletitas Sin TACC X',
  categoria: 'galletitas',
  riesgo: 'bajo',
  imagenUrl: '/uploads/x.jpg',
};

const INTENT = {
  kind: 'filter' as const,
  categoria: 'galletitas' as const,
  riesgo_max: null,
  apto: null,
  alergeno_excluido: null,
  keywords: [],
  comparar: [],
};

/** Construye un mock de fetchChatStream que emite la secuencia dada de eventos. */
function streamMock(events: ChatStreamEvent[]): typeof fetchChatStream {
  return vi.fn(async (_q: string, onEvent: (e: ChatStreamEvent) => void) => {
    for (const e of events) onEvent(e);
  }) as unknown as typeof fetchChatStream;
}

/** Secuencia estándar: meta(chips) → delta → suggestions → done. */
function answerEvents(opts: {
  text: string;
  products?: ChatProductRef[];
  fallback?: ChatFallback | null;
  suggestions?: string[] | null;
}): ChatStreamEvent[] {
  return [
    {
      type: 'meta',
      products: opts.products ?? [],
      intent: INTENT,
      fallback: opts.fallback ?? null,
    },
    { type: 'delta', text: opts.text },
    { type: 'suggestions', suggestions: opts.suggestions ?? null },
    { type: 'done', answer: opts.text, tokensUsed: { in: 80, out: 22 } },
  ];
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('<ChatPageClient> — persistencia sin duplicar (re-entrar a la conversación)', () => {
  it('persiste el intercambio una sola vez (no [U, A, U, A])', async () => {
    createConversationMock.mockClear();
    const user = userEvent.setup();
    const fetchStreamImpl = streamMock(answerEvents({ text: 'respuesta del asistente' }));

    render(<ChatPageClient productsInBase={3} fetchStreamImpl={fetchStreamImpl} />);
    await user.type(screen.getByTestId('chat-input'), 'mi pregunta{Enter}');

    await waitFor(() => expect(createConversationMock).toHaveBeenCalledTimes(1));
    const persisted = createConversationMock.mock.calls[0]![0];
    expect(persisted).toHaveLength(2);
    expect(persisted[0]).toMatchObject({ role: 'user', text: 'mi pregunta' });
    expect(persisted[1]).toMatchObject({ role: 'assistant', text: 'respuesta del asistente' });
  });
});

describe('<ChatPageClient> — flujo happy (US-27 §1 + NL-304 streaming)', () => {
  it('envío → user bubble → respuesta del asistente con chip', async () => {
    const user = userEvent.setup();
    const fetchStreamImpl = streamMock(
      answerEvents({ text: 'Tenés 1 galletita guardada.', products: [CHIP] }),
    );

    render(<ChatPageClient productsInBase={5} fetchStreamImpl={fetchStreamImpl} />);

    expect(screen.getByTestId('chat-hero')).toBeInTheDocument();
    await user.type(screen.getByTestId('chat-input'), 'mostrame galletitas{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('chat-assistant-bubble')).toHaveTextContent(
        'Tenés 1 galletita guardada.',
      );
    });
    expect(screen.getByTestId('chat-user-bubble')).toHaveTextContent('mostrame galletitas');
    expect(screen.queryByTestId('chat-thinking')).not.toBeInTheDocument();
    expect(screen.getByTestId('chat-product-chip')).toBeInTheDocument();
  });

  it('construye la respuesta desde múltiples deltas', async () => {
    const user = userEvent.setup();
    const fetchStreamImpl = streamMock([
      { type: 'meta', products: [], intent: INTENT, fallback: null },
      { type: 'delta', text: 'Hola ' },
      { type: 'delta', text: 'mundo' },
      { type: 'done', answer: 'Hola mundo', tokensUsed: { in: 1, out: 2 } },
    ]);

    render(<ChatPageClient productsInBase={5} fetchStreamImpl={fetchStreamImpl} />);
    await user.type(screen.getByTestId('chat-input'), 'hola{Enter}');

    await waitFor(() =>
      expect(screen.getByTestId('chat-assistant-bubble')).toHaveTextContent('Hola mundo'),
    );
  });

  it('mantiene mensajes previos al hacer una 2da pregunta (US-27 §2)', async () => {
    const user = userEvent.setup();
    const fetchStreamImpl = vi
      .fn()
      .mockImplementationOnce(async (_q: string, onEvent: (e: ChatStreamEvent) => void) => {
        for (const e of answerEvents({ text: 'Tenés 1 galletita.', products: [CHIP] })) onEvent(e);
      })
      .mockImplementationOnce(async (_q: string, onEvent: (e: ChatStreamEvent) => void) => {
        for (const e of answerEvents({ text: 'Segunda respuesta.' })) onEvent(e);
      }) as unknown as typeof fetchChatStream;

    render(<ChatPageClient productsInBase={5} fetchStreamImpl={fetchStreamImpl} />);

    await user.type(screen.getByTestId('chat-input'), 'primera{Enter}');
    await waitFor(() =>
      expect(screen.getByTestId('chat-assistant-bubble')).toHaveTextContent('Tenés 1 galletita'),
    );

    await user.type(screen.getByTestId('chat-input'), 'segunda{Enter}');
    await waitFor(() =>
      expect(screen.getByText((c) => c.includes('Segunda respuesta'))).toBeInTheDocument(),
    );

    expect(screen.getAllByTestId('chat-user-bubble')).toHaveLength(2);
    expect(screen.getAllByTestId('chat-assistant-bubble')).toHaveLength(2);
  });
});

describe('<ChatPageClient> — reset (US-27 §3)', () => {
  it('"Nueva conversación" limpia el thread y vuelve al hero', async () => {
    const user = userEvent.setup();
    const fetchStreamImpl = streamMock(answerEvents({ text: 'respuesta', products: [CHIP] }));
    render(<ChatPageClient productsInBase={5} fetchStreamImpl={fetchStreamImpl} />);

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
    const fetchStreamImpl = streamMock(answerEvents({ text: 'respuesta', products: [CHIP] }));
    render(<ChatPageClient productsInBase={5} fetchStreamImpl={fetchStreamImpl} />);

    await user.click(screen.getAllByTestId('chat-suggestion')[0]!);

    await waitFor(() => expect(fetchStreamImpl).toHaveBeenCalledOnce());
    expect(fetchStreamImpl).toHaveBeenCalledWith(
      'Mostrame productos aptos para celíacos',
      expect.any(Function),
    );
    await waitFor(() => expect(screen.getByTestId('chat-assistant-bubble')).toBeInTheDocument());
  });
});

describe('<ChatPageClient> — fallback no_context (US-30 §1+§2)', () => {
  it('muestra mensaje + CTA cuando fallback.showAnalyzeCta=true', async () => {
    const user = userEvent.setup();
    const fetchStreamImpl = streamMock(
      answerEvents({
        text: 'No tengo productos guardados que respondan a esa pregunta.',
        fallback: { answer: 'irrelevant', reason: 'no_context', showAnalyzeCta: true },
      }),
    );

    render(<ChatPageClient productsInBase={0} fetchStreamImpl={fetchStreamImpl} />);

    await user.type(screen.getByTestId('chat-input'), 'mostrame snacks{Enter}');

    await waitFor(() =>
      expect(screen.getByTestId('chat-assistant-bubble')).toHaveTextContent(
        'No tengo productos guardados',
      ),
    );
    const cta = screen.getByTestId('chat-analyze-cta');
    expect(cta.getAttribute('href')).toBe('/analizar');
    expect(screen.queryByTestId('chat-product-chip')).not.toBeInTheDocument();
  });
});

describe('<ChatPageClient> — estado ERROR (spec §9.4)', () => {
  it('evento error → ChatErrorBanner con retry; retry reenvía la última pregunta', async () => {
    const user = userEvent.setup();
    const fetchStreamImpl = vi
      .fn()
      .mockImplementationOnce(async (_q: string, onEvent: (e: ChatStreamEvent) => void) => {
        onEvent({
          type: 'error',
          error: 'model_rate_limited',
          reason: 'Saturado, probá en un rato.',
        });
      })
      .mockImplementationOnce(async (_q: string, onEvent: (e: ChatStreamEvent) => void) => {
        for (const e of answerEvents({ text: 'Listo ahora.', products: [CHIP] })) onEvent(e);
      }) as unknown as typeof fetchChatStream;

    render(<ChatPageClient productsInBase={3} fetchStreamImpl={fetchStreamImpl} />);

    await user.type(screen.getByTestId('chat-input'), 'mostrame galletitas{Enter}');
    await waitFor(() => expect(screen.getByTestId('chat-error')).toBeInTheDocument());
    expect(screen.getByTestId('chat-error')).toHaveTextContent('Saturado');

    await user.click(screen.getByTestId('chat-retry'));

    await waitFor(() => expect(screen.getByTestId('chat-assistant-bubble')).toBeInTheDocument());
    expect(fetchStreamImpl).toHaveBeenCalledTimes(2);
    expect(fetchStreamImpl).toHaveBeenNthCalledWith(2, 'mostrame galletitas', expect.any(Function));
  });

  it('rechazo de red (throw) → mensaje fallback "Algo salió mal"', async () => {
    const user = userEvent.setup();
    const fetchStreamImpl = vi
      .fn()
      .mockRejectedValue(new Error('network')) as unknown as typeof fetchChatStream;

    render(<ChatPageClient productsInBase={3} fetchStreamImpl={fetchStreamImpl} />);

    await user.type(screen.getByTestId('chat-input'), 'algo{Enter}');
    await waitFor(() => expect(screen.getByTestId('chat-error')).toBeInTheDocument());
    expect(screen.getByTestId('chat-error')).toHaveTextContent(/Algo salió mal/);
  });
});

describe('<ChatPageClient> — input bloqueado mientras responde', () => {
  it('input + send quedan disabled hasta que cierra el stream', async () => {
    const user = userEvent.setup();
    let release: (() => void) | null = null;
    const fetchStreamImpl = vi.fn(
      (_q: string, onEvent: (e: ChatStreamEvent) => void) =>
        new Promise<void>((resolve) => {
          onEvent({ type: 'meta', products: [], intent: INTENT, fallback: null });
          onEvent({ type: 'delta', text: 'escribiendo…' });
          release = () => {
            onEvent({ type: 'done', answer: 'listo', tokensUsed: { in: 0, out: 0 } });
            resolve();
          };
        }),
    ) as unknown as typeof fetchChatStream;

    render(<ChatPageClient productsInBase={3} fetchStreamImpl={fetchStreamImpl} />);

    await user.type(screen.getByTestId('chat-input'), 'q{Enter}');

    await waitFor(() => expect(screen.getByTestId('chat-input')).toBeDisabled());
    expect(screen.getByTestId('chat-send')).toBeDisabled();

    release!();
    await waitFor(() => expect(screen.getByTestId('chat-input')).not.toBeDisabled());
  });
});
