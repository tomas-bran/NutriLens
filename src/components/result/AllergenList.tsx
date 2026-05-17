/**
 * Allergen chips. Pencil ref: `UNhqy` Component/Allergen/Gluten and siblings
 * — pink-tinted chip with a small allergen icon. Section is hidden when
 * the array is empty.
 */
import { Icon, type IconName } from '@/components/ui/Icon';

const ALLERGEN_ICON: Record<string, IconName> = {
  gluten: 'check', // small dot — placeholder for an allergen-specific glyph
  leche: 'check',
  huevo: 'check',
  soja: 'check',
  pescado: 'check',
};

export function AllergenList({ allergens }: { allergens: ReadonlyArray<string> }) {
  if (allergens.length === 0) return null;
  return (
    <section aria-labelledby="allergens-title" className="flex flex-col gap-2">
      <h2 id="allergens-title" className="text-[14px] font-bold text-[var(--color-text)]">
        Alérgenos
      </h2>
      <div className="flex flex-wrap gap-2" data-testid="allergen-chips" role="list">
        {allergens.map((a) => (
          <span
            key={a}
            role="listitem"
            data-testid={`allergen-${a}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-danger-bg)] bg-[var(--color-danger-bg)] px-3 py-1 text-[12px] font-bold text-[var(--color-risk-high)]"
          >
            <Icon name={ALLERGEN_ICON[a] ?? 'check'} className="h-3 w-3" strokeWidth={2.5} />
            {capitalize(a)}
          </span>
        ))}
      </div>
    </section>
  );
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
