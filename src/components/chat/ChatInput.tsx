/**
 * <ChatInput> — pill rounded input + circular send button (Pencil M11 `o1GDOn`,
 * D05 `t9rx3A`). Enter envía; Shift+Enter agrega newline (spec §9.2). Cuando
 * el chat está `THINKING`, el input se deshabilita.
 *
 * Es controlled: el page mantiene el draft. El submit corta string vacío y
 * no propaga el evento al parent — siempre devuelve `text` ya trimmed.
 */
'use client';

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Icon } from '@/components/ui/Icon';

interface ChatInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  /** Pre-fill del textarea (ej: cuando se hace retry del último mensaje). */
  initialValue?: string;
}

export function ChatInput({ onSubmit, disabled = false, initialValue = '' }: ChatInputProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue('');
    // Reset alto del textarea después de enviar (puede haber crecido por wrap).
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSubmit]);

  const onFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-grow hasta ~5 líneas (max-h limita arriba).
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <form
      onSubmit={onFormSubmit}
      className="flex w-full items-end gap-2"
      data-testid="chat-input-form"
    >
      <div className="flex flex-1 items-center gap-2 rounded-3xl border border-[var(--color-border)] bg-white px-4 py-2 shadow-sm transition-colors focus-within:border-[var(--color-primary)]">
        <textarea
          ref={textareaRef}
          data-testid="chat-input"
          aria-label="Escribí una pregunta sobre tus productos"
          placeholder="Preguntá lo que quieras..."
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          className="max-h-32 w-full resize-none bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-60 md:text-base"
        />
      </div>
      <button
        type="submit"
        aria-label="Enviar pregunta"
        data-testid="chat-send"
        disabled={!canSend}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[0_2px_8px_0_rgba(22,163,74,0.25)] transition-colors hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:shadow-none"
      >
        <Icon name="arrow-right" className="h-5 w-5" aria-hidden="true" />
      </button>
    </form>
  );
}
