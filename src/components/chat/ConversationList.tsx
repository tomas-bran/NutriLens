'use client';

/**
 * <ConversationList> — lista de conversaciones guardadas en el empty state del chat.
 * NL-301: muestra historial de chats con fecha legible.
 * NL-302: permite renombrar (inline) y eliminar con confirmación.
 */
import { useRef, useState } from 'react';
import type { ConversationSummary } from '@/lib/conversations/types';
import { deleteConversation, updateConversation } from '@/lib/conversations/client';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

interface ConversationListProps {
  conversations: ConversationSummary[];
  onOpen: (id: string) => void;
  onDelete: () => void;
}

export function ConversationList({ conversations, onOpen, onDelete }: ConversationListProps) {
  const [items, setItems] = useState(conversations);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  async function handleRename(id: string) {
    const newTitle = renameInputRef.current?.value.trim();
    if (!newTitle) {
      setRenaming(null);
      return;
    }
    const updated = await updateConversation(id, { title: newTitle });
    if (updated) {
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c)));
    }
    setRenaming(null);
  }

  async function handleDelete(id: string) {
    const ok = await deleteConversation(id);
    if (ok) {
      setItems((prev) => prev.filter((c) => c.id !== id));
      setConfirmDelete(null);
      if (items.length === 1) onDelete();
    }
  }

  if (items.length === 0) return null;

  return (
    <section data-testid="conversation-list" className="flex flex-col gap-2">
      <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
        Conversaciones recientes
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((conv) => (
          <li
            key={conv.id}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3"
          >
            {confirmDelete === conv.id ? (
              <div className="flex flex-1 items-center gap-2">
                <span className="flex-1 text-sm text-[var(--color-text)]">
                  ¿Eliminar &quot;{conv.title.slice(0, 40)}&quot;?
                </span>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmDelete(null)}
                  className="px-2 py-1 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => void handleDelete(conv.id)}
                  className="border-red-500 bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                >
                  Eliminar
                </Button>
              </div>
            ) : (
              <>
                {renaming === conv.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      ref={renameInputRef}
                      defaultValue={conv.title}
                      data-testid={`conv-rename-input-${conv.id}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleRename(conv.id);
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      className="flex-1 rounded-lg border border-[var(--color-primary)] px-2 py-1 text-sm outline-none"
                      autoFocus
                    />
                    <Button
                      onClick={() => void handleRename(conv.id)}
                      className="px-2 py-1 text-xs"
                    >
                      Guardar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setRenaming(null)}
                      className="px-2 py-1 text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpen(conv.id)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      data-testid={`conv-open-${conv.id}`}
                    >
                      <Icon
                        name="chat"
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--color-text)]">
                          {conv.title}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {formatDate(conv.updatedAt)} · {conv.messageCount} mensajes
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming(conv.id)}
                      aria-label={`Renombrar conversación "${conv.title}"`}
                      data-testid={`conv-rename-${conv.id}`}
                      className="flex-shrink-0 rounded-lg p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    >
                      <Icon name="pencil" className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(conv.id)}
                      aria-label={`Eliminar conversación "${conv.title}"`}
                      data-testid={`conv-delete-${conv.id}`}
                      className="flex-shrink-0 rounded-lg p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)]"
                    >
                      <Icon name="close" className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}
