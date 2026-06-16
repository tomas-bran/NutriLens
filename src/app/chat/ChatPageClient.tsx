/**
 * `<ChatPageClient>` — client component que orquesta la pantalla `/chat`.
 *
 * NL-301: las conversaciones se persisten en DB via /api/conversations.
 * Cada vez que el asistente responde, la conversación se guarda/actualiza.
 * Al resetear se crea una nueva conversación vacía en memoria.
 *
 * NL-302: renombrar y eliminar desde el panel de catálogo de chats.
 */
'use client';

import { useCallback, useRef, useReducer } from 'react';
import { ApiError } from '@schemas/errors';
import { ChatErrorBanner } from '@/components/chat/ChatErrorBanner';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatHero } from '@/components/chat/ChatHero';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatThread } from '@/components/chat/ChatThread';
import { SuggestionPills } from '@/components/chat/SuggestionPills';
import type { ChatMessage, ChatStatus } from '@/components/chat/types';
import { fetchChat } from '@/lib/chat/fetch-chat';
import type { ChatApiResponse } from '@/lib/chat/response';
import { createConversation, updateConversation } from '@/lib/conversations/client';
import type { ConversationSummary } from '@/lib/conversations/types';
import { ConversationList } from '@/components/chat/ConversationList';

interface ChatPageClientProps {
  productsInBase: number;
  /** Pre-loaded conversation list (SSR) for the initial empty state. */
  initialConversations?: ConversationSummary[];
  /** Inyectable para tests. */
  fetchImpl?: typeof fetchChat;
}

interface State {
  messages: ChatMessage[];
  status: ChatStatus;
  error: string | null;
  lastUserQuestion: string | null;
  /** Pills contextuales del último response (NL-503); null => set estático. */
  suggestions: string[] | null;
}

type Action =
  | { type: 'submit'; userMessage: ChatMessage; question: string }
  | { type: 'success'; assistant: ChatMessage; suggestions: string[] | null }
  | { type: 'error'; message: string }
  | { type: 'reset' }
  | { type: 'load'; messages: ChatMessage[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'submit':
      return {
        ...state,
        messages: [...state.messages, action.userMessage],
        status: 'THINKING',
        error: null,
        lastUserQuestion: action.question,
      };
    case 'success':
      return {
        ...state,
        messages: [...state.messages, action.assistant],
        status: 'IDLE',
        error: null,
        // Si este response no trajo sugerencias, conservamos las anteriores
        // (mejor contexto viejo que volver al set estático a mitad de charla).
        suggestions: action.suggestions ?? state.suggestions,
      };
    case 'error':
      return { ...state, status: 'ERROR', error: action.message };
    case 'reset':
      return {
        messages: [],
        status: 'IDLE',
        error: null,
        lastUserQuestion: null,
        suggestions: null,
      };
    case 'load':
      // Conversación recuperada de la DB: sin sugerencias previas (se
      // regeneran con la próxima respuesta).
      return {
        messages: action.messages,
        status: 'IDLE',
        error: null,
        lastUserQuestion: null,
        suggestions: null,
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
};

export function ChatPageClient({
  productsInBase,
  initialConversations = [],
  fetchImpl = fetchChat,
}: ChatPageClientProps) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const conversationIdRef = useRef<string | null>(null);

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
      // Persistence is best-effort; never block the UI
    }
  }, []);

  const handleSubmit = useCallback(
    async (question: string) => {
      const userMessage: ChatMessage = {
        role: 'user',
        id: makeId(),
        text: question,
      };
      dispatch({ type: 'submit', userMessage, question });

      try {
        const res: ChatApiResponse = await fetchImpl(question);
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          id: makeId(),
          text: res.answer,
          products: res.products,
          fallback: res.fallback,
        };
        dispatch({
          type: 'success',
          assistant: assistantMessage,
          suggestions: res.suggestions ?? null,
        });

        // NL-301: persist after each full exchange
        const allMessages = [...state.messages, userMessage, assistantMessage];
        void persistMessages(allMessages);
      } catch (err) {
        const reason =
          err instanceof ApiError ? err.reason : 'Algo salió mal. Probá de nuevo en unos segundos.';
        dispatch({ type: 'error', message: reason });
      }
    },
    [fetchImpl, state.messages, persistMessages],
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
  const inputDisabled = state.status === 'THINKING';

  return (
    <div className="flex h-full flex-col gap-4 md:min-h-[calc(100vh-2rem)]">
      <ChatHeader productsInBase={productsInBase} hasMessages={hasMessages} onReset={handleReset} />

      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-2">
          {!hasMessages && state.status !== 'THINKING' ? (
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

        <div className="sticky bottom-0 bg-[var(--color-bg)] pt-2">
          {hasMessages && state.status === 'IDLE' && (
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
    </div>
  );
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `m-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}
