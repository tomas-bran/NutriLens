'use client';

/**
 * Controles de administración del producto (solo admins): renombrar y eliminar.
 * Se renderiza en el detalle del catálogo cuando `isCurrentUserAdmin()`. Las
 * mutaciones pegan a `PATCH/DELETE /api/products/[id]` (también admin-gated).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface AdminProductControlsProps {
  productId: string;
  currentName: string;
}

export function AdminProductControls({ productId, currentName }: AdminProductControlsProps) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState<null | 'rename' | 'delete'>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const trimmed = name.trim();
  const renameDisabled = busy !== null || trimmed.length === 0 || trimmed === currentName.trim();

  const onRename = async () => {
    setError(null);
    setBusy('rename');
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: trimmed }),
      });
      if (!res.ok) throw new Error(`rename ${res.status}`);
      router.refresh();
    } catch {
      setError('No pudimos renombrar el producto. Probá de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async () => {
    setError(null);
    setBusy('delete');
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`delete ${res.status}`);
      router.push('/catalogo');
      router.refresh();
    } catch {
      setError('No pudimos eliminar el producto. Probá de nuevo.');
      setBusy(null);
    }
  };

  return (
    <section
      data-testid="admin-product-controls"
      className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-4"
      aria-label="Administración del producto"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[var(--color-ink-900)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Admin
        </span>
        <h3 className="text-sm font-bold text-[var(--color-text)]">Administrar producto</h3>
      </div>

      {/* Renombrar */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="admin-rename"
          className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
        >
          Nombre
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="admin-rename"
            type="text"
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            data-testid="admin-rename-input"
            className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
          />
          <Button onClick={onRename} disabled={renameDisabled} data-testid="admin-rename-save">
            {busy === 'rename' ? 'Guardando…' : 'Guardar nombre'}
          </Button>
        </div>
      </div>

      <hr className="border-[var(--color-border)]" />

      {/* Eliminar */}
      {!confirmDelete ? (
        <Button
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          disabled={busy !== null}
          data-testid="admin-delete"
          className="self-start text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
        >
          Eliminar producto
        </Button>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-danger-bg)] p-3">
          <p className="text-[13px] font-medium text-[var(--color-risk-high)]">
            ¿Seguro que querés eliminar este producto? No se puede deshacer.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={onDelete}
              disabled={busy !== null}
              data-testid="admin-delete-confirm"
              className="bg-[var(--color-danger)] hover:bg-[var(--color-risk-high)]"
            >
              {busy === 'delete' ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
              disabled={busy !== null}
              data-testid="admin-delete-cancel"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-[13px] text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
