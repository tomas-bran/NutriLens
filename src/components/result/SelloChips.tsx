/**
 * Argentine octogonal "sello" badges (exceso azúcares, exceso grasas, etc.).
 * Pencil refs: `b1iFC` / `S57Dh2` / `JwURM` / `PZBZB` / `cj7bT` / `zYC82`.
 *
 * Rendered as small dark blocks per the wireframe — matches the real
 * regulatory sellos negros visual language.
 */
import type { Sello } from '@schemas/product';

const SELLO_LABEL: Record<Sello, string> = {
  'exceso en azúcares': 'Exceso azúcares',
  'exceso en grasas saturadas': 'Exceso grasas saturadas',
  'exceso en grasas totales': 'Exceso grasas',
  'exceso en sodio': 'Exceso sodio',
  'exceso en calorías': 'Exceso calorías',
};

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
      <div className="flex flex-wrap gap-2" data-testid="sello-chips" role="list">
        {sellos.map((s) => (
          <span
            key={s}
            role="listitem"
            data-testid={`sello-${selloTestId(s)}`}
            className="inline-flex h-14 w-20 items-center justify-center rounded-[8px] bg-[var(--color-ink-900)] px-2 py-1 text-center text-[10px] font-extrabold uppercase leading-tight text-white"
          >
            {SELLO_LABEL[s] ?? s}
          </span>
        ))}
      </div>
    </section>
  );
}
