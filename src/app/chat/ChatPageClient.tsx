/**
 * `<ChatPageClient>` — client component que orquesta la pantalla `/chat`.
 *
 * NL-304: la respuesta del asistente llega por streaming (SSE). Se muestra un
 * mensaje que se va completando en vivo; al cerrar se reemplaza por el texto
 * sanitizado autoritativo. `fetchStreamImpl` es inyectable para tests.
 * NL-305: el input queda fijo abajo, solo el hilo scrollea, y el autoscroll
 * sigue la respuesta sin robar el scroll si el usuario subió.
 * NL-301/302: las conversaciones se persisten y se pueden retomar/renombrar.
 */
'use client';

import { useCallback, useReducer, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ChatErrorBanner } from '@/components/chat/ChatErrorBanner';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatHero } from '@/components/chat/ChatHero';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatThread } from '@/components/chat/ChatThread';
import { ConversationList } from '@/components/chat/ConversationList';
import { SuggestionPills } from '@/components/chat/SuggestionPills';
import { useStickyAutoscroll } from '@/components/chat/use-sticky-autoscroll';
import type { ChatMessage, ChatStatus } from '@/components/chat/types';
import { fetchChatStream } from '@/lib/chat/fetch-chat-stream';
import type { ChatProductRef } from '@/lib/chat/response';
import type { ChatFallback } from '@/lib/chat/empty-response';
import { createConversation, updateConversation } from '@/lib/conversations/client';
import type { ConversationSummary } from '@/lib/conversations/types';

interface ChatPageClientProps {
  productsInBase: number;
  historialCount: number;
  /** Pre-loaded conversation list (SSR) for the initial empty state. */
  initialConversations?: ConversationSummary[];
  /** Inyectable para tests (streaming SSE). */
  fetchStreamImpl?: typeof fetchChatStream;
}

interface State {
  messages: ChatMessage[];
  status: ChatStatus;
  error: string | null;
  lastUserQuestion: string | null;
  suggestions: string[] | null;
  /** Cambia con cada delta/transición → dispara el autoscroll pegajoso. */
  scrollTick: number;
}

type Action =
  | { type: 'submit'; userMessage: ChatMessage; question: string }
  | {
      type: 'stream_meta';
      assistantId: string;
      products: ChatProductRef[];
      fallback: ChatFallback | null;
    }
  | { type: 'stream_delta'; assistantId: string; text: string }
  | { type: 'stream_done'; assistantId: string; answer: string; suggestions: string[] | null }
  | { type: 'error'; message: string }
  | { type: 'reset' }
  | { type: 'load'; messages: ChatMessage[] };

function patchAssistant(
  messages: ChatMessage[],
  id: string,
  patch: (m: Extract<ChatMessage, { role: 'assistant' }>) => ChatMessage,
): ChatMessage[] {
  return messages.map((m) => (m.role === 'assistant' && m.id === id ? patch(m) : m));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'submit':
      return {
        ...state,
        messages: [...state.messages, action.userMessage],
        status: 'THINKING',
        error: null,
        lastUserQuestion: action.question,
        scrollTick: state.scrollTick + 1,
      };
    case 'stream_meta':
      return {
        ...state,
        status: 'STREAMING',
        messages: [
          ...state.messages,
          {
            role: 'assistant',
            id: action.assistantId,
            text: '',
            products: action.products,
            fallback: action.fallback,
          },
        ],
        scrollTick: state.scrollTick + 1,
      };
    case 'stream_delta':
      return {
        ...state,
        messages: patchAssistant(state.messages, action.assistantId, (m) => ({
          ...m,
          text: m.text + action.text,
        })),
        scrollTick: state.scrollTick + 1,
      };
    case 'stream_done':
      return {
        ...state,
        status: 'IDLE',
        messages: patchAssistant(state.messages, action.assistantId, (m) => ({
          ...m,
          text: action.answer,
        })),
        suggestions: action.suggestions ?? state.suggestions,
        scrollTick: state.scrollTick + 1,
      };
    case 'error':
      return { ...state, status: 'ERROR', error: action.message, scrollTick: state.scrollTick + 1 };
    case 'reset':
      return { ...INITIAL_STATE };
    case 'load':
      return {
        ...INITIAL_STATE,
        messages: action.messages,
        scrollTick: state.scrollTick + 1,
      };
    default:
      return state;
  }
}

const INITIAL_STATE: State = {
  messages: [],
  status: 'IDLE',
  error: null,
  lastUserQuestion: null,
  suggestions: null,
  scrollTick: 0,
};

export function ChatPageClient({
  productsInBase,
  historialCount,
  initialConversations = [],
  fetchStreamImpl = fetchChatStream,
}: ChatPageClientProps) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const conversationIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useStickyAutoscroll(scrollRef, state.scrollTick);

  const persistMessages = useCallback(async (messages: ChatMessage[]) => {
    try {
      const stored = messages.map((m) =>
        m.role === 'user'
          ? { role: 'user' as const, text: m.text }
          : {
              role: 'assistant' as const,
              text: m.text,
              products: m.products,
              fallback: m.fallback,
            },
      );
      if (!conversationIdRef.current) {
        const created = await createConversation(stored);
        if (created) conversationIdRef.current = created.id;
      } else {
        await updateConversation(conversationIdRef.current, { messages: stored });
      }
    } catch {
      // Persistencia best-effort; nunca bloquea la UI.
    }
  }, []);

  const handleSubmit = useCallback(
    async (question: string) => {
      const userMessage: ChatMessage = { role: 'user', id: makeId(), text: question };
      const assistantId = makeId();
      dispatch({ type: 'submit', userMessage, question });

      let answer = '';
      let products: ChatProductRef[] = [];
      let fallback: ChatFallback | null = null;
      let suggestions: string[] | null = null;
      let streamError: string | null = null;

      try {
        await fetchStreamImpl(question, (event) => {
          switch (event.type) {
            case 'meta':
              products = event.products;
              fallback = event.fallback;
              dispatch({ type: 'stream_meta', assistantId, products, fallback });
              break;
            case 'delta':
              answer += event.text;
              dispatch({ type: 'stream_delta', assistantId, text: event.text });
              break;
            case 'suggestions':
              suggestions = event.suggestions;
              break;
            case 'done':
              answer = event.answer;
              dispatch({ type: 'stream_done', assistantId, answer, suggestions });
              break;
            case 'error':
              streamError = event.reason;
              break;
          }
        });
      } catch {
        streamError = streamError ?? 'Algo salió mal. Probá de nuevo en unos segundos.';
      }

      if (streamError) {
        dispatch({ type: 'error', message: streamError });
        return;
      }

      // NL-301: persistir el intercambio completo una vez cerrado el stream.
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        id: assistantId,
        text: answer,
        products,
        fallback,
      };
      void persistMessages([...stateMessagesRef.current, userMessage, assistantMessage]);
    },
    [fetchStreamImpl, persistMessages],
  );

  // Ref con los mensajes previos al envío, para componer el array a persistir
  // sin meter `state.messages` en las deps de handleSubmit (evita recrearlo).
  const stateMessagesRef = useRef<ChatMessage[]>([]);
  stateMessagesRef.current = state.messages.filter(
    (m) => m.role !== 'assistant' || m.text.length > 0,
  );

  const handleRetry = useCallback(() => {
    if (state.lastUserQuestion) void handleSubmit(state.lastUserQuestion);
  }, [state.lastUserQuestion, handleSubmit]);

  const handleReset = useCallback(() => {
    conversationIdRef.current = null;
    dispatch({ type: 'reset' });
  }, []);

  const handleLoadConversation = useCallback(async (id: string) => {
    const { getConversation } = await import('@/lib/conversations/client');
    const conv = await getConversation(id);
    if (!conv) return;
    conversationIdRef.current = id;
    const messages: ChatMessage[] = conv.messages.map((m) => ({
      role: m.role,
      id: makeId(),
      text: m.text,
      ...(m.role === 'assistant'
        ? { products: m.products ?? [], fallback: m.fallback ?? null }
        : {}),
    })) as ChatMessage[];
    dispatch({ type: 'load', messages });
  }, []);

  const hasMessages = state.messages.length > 0;
  const inputDisabled = state.status === 'THINKING' || state.status === 'STREAMING';
  const showPills = hasMessages && state.status === 'IDLE';

  return (
    <AppShell active="chat" historialCount={historialCount}>
      {/* Altura acotada: el hilo scrollea internamente, el input queda fijo. */}
      <div className="flex h-[calc(100dvh-1.5rem)] min-h-0 flex-col gap-4 md:h-[calc(100vh-3rem)]">
        <ChatHeader
          productsInBase={productsInBase}
          hasMessages={hasMessages}
          onReset={handleReset}
        />

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-2">
          {!hasMessages && state.status === 'IDLE' ? (
            <div className="flex flex-col gap-6">
              <ChatHero onPick={handleSubmit} />
              {initialConversations.length > 0 && (
                <ConversationList
                  conversations={initialConversations}
                  onOpen={handleLoadConversation}
                  onDelete={handleReset}
                />
              )}
            </div>
          ) : (
            <ChatThread messages={state.messages} status={state.status} />
          )}
        </div>

        {state.error && state.status === 'ERROR' && (
          <ChatErrorBanner
            message={state.error}
            onRetry={handleRetry}
            canRetry={state.lastUserQuestion !== null}
          />
        )}

        <div className="shrink-0 bg-[var(--color-bg)] pt-1">
          {showPills && (
            <SuggestionPills
              onPick={handleSubmit}
              suggestions={state.suggestions}
              lastQuestion={state.lastUserQuestion}
              className="mb-2"
            />
          )}
          <ChatInput onSubmit={handleSubmit} disabled={inputDisabled} />
        </div>
      </div>
    </AppShell>
  );
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `m-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
