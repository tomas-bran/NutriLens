/**
 * Sellos negros regulatorios del Ministerio de Salud (Argentina).
 *
 * Spec gráfico: octágono negro con texto "EXCESO EN <nutriente>" arriba en
 * mayúsculas grandes y "Ministerio de Salud" abajo en chico. Reproduce los
 * sellos reales (Ley 27.642).
 *
 * Pencil refs: `b1iFC` / `S57Dh2` / `JwURM` / `PZBZB`.
 */
import type { Sello } from '@schemas/product';
import { cn } from '@/lib/cn';

/**
 * Cada sello rompe en `(prefijo) + (nutriente)` para poder maquetar el texto
 * en dos líneas como en el sello regulatorio real.
 */
const SELLO_PARTS: Record<Sello, { line1: string; line2: string }> = {
  'exceso en azúcares': { line1: 'Exceso en', line2: 'Azúcares' },
  'exceso en grasas saturadas': { line1: 'Exceso en', line2: 'Grasas saturadas' },
  'exceso en grasas totales': { line1: 'Exceso en', line2: 'Grasas totales' },
  'exceso en sodio': { line1: 'Exceso en', line2: 'Sodio' },
  'exceso en calorías': { line1: 'Exceso en', line2: 'Calorías' },
};

// Regular octagon via clip-path. The 29.3% cut is the geometric ratio for a
// regular octagon: (1 - 1/√2) / 2 ≈ 0.1464 from each corner relative to the
// container side, multiplied by 2 = 29.3% — but the standard CSS recipe uses
// these eight points which produce a visually-regular octagon at any size.
const OCTAGON_CLIP_PATH =
  'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';

function selloTestId(s: Sello): string {
  return s.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function SelloChips({ sellos }: { sellos: ReadonlyArray<Sello> }) {
  if (sellos.length === 0) return null;
  return (
    <section aria-labelledby="sellos-title" className="flex flex-col gap-2">
      <h2 id="sellos-title" className="text-[14px] font-bold text-[var(--color-text)]">
        Sellos detectados
      </h2>
      <div className="flex flex-wrap gap-3" data-testid="sello-chips" role="list">
        {sellos.map((s) => (
          <SelloBadge key={s} sello={s} />
        ))}
      </div>
    </section>
  );
}

function SelloBadge({ sello }: { sello: Sello }) {
  const { line1, line2 } = SELLO_PARTS[sello];
  return (
    <span
      role="listitem"
      data-testid={`sello-${selloTestId(sello)}`}
      aria-label={`Sello: ${sello}`}
      className={cn(
        'flex h-24 w-24 flex-col items-center justify-center gap-0.5 bg-[var(--color-ink-900)] px-1 text-center text-white',
      )}
      style={{ clipPath: OCTAGON_CLIP_PATH }}
    >
      <span className="text-[9px] font-bold uppercase leading-tight tracking-wide">{line1}</span>
      <span className="text-[11px] font-extrabold uppercase leading-tight">{line2}</span>
      <span className="mt-0.5 text-[6px] font-medium uppercase leading-tight tracking-wider text-white/80">
        Ministerio
        <br />
        de Salud
      </span>
    </span>
  );
}
