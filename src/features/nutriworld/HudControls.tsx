'use client';

/**
 * HUD 2D: ayuda de controles (arriba a la izquierda) y el prompt "E para ver
 * ficha" cuando el jugador está cerca de un producto resaltado y no hay ficha
 * abierta.
 */
import { getProductById } from './data/products';
import { useNutriWorld } from './store/useNutriWorldStore';

const CONTROLS: Array<[string, string]> = [
  ['WASD / ↑↓←→', 'moverte'],
  ['Shift', 'correr'],
  ['E', 'interactuar'],
];

export function HudControls() {
  const nearId = useNutriWorld((s) => s.nearProductId);
  const selectedId = useNutriWorld((s) => s.selectedProductId);
  const near = nearId ? getProductById(nearId) : undefined;

  return (
    <>
      <div className="pointer-events-none absolute left-4 top-16 rounded-xl border border-[var(--color-border)] bg-white/85 px-3 py-2 text-[11px] text-[var(--color-text-muted)] shadow-sm backdrop-blur">
        {CONTROLS.map(([key, action]) => (
          <p key={key} className="flex items-center gap-2 leading-relaxed">
            <kbd className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text)]">
              {key}
            </kbd>
            {action}
          </p>
        ))}
      </div>

      {near && !selectedId && (
        <div
          data-testid="nutriworld-interact-prompt"
          className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-text)] px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          <kbd className="mr-1.5 rounded bg-white/25 px-1.5 py-0.5 font-mono text-xs">E</kbd>
          ver {near.name}
        </div>
      )}
    </>
  );
}
