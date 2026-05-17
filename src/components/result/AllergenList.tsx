/**
 * Allergen chips. Each chip pairs the canonical Spanish label with a glyph
 * representing what the allergen is (wheat ear for gluten, milk carton for
 * leche, etc.). Generic `allergen` icon for unmapped values.
 *
 * Pencil refs: `UNhqy` / `LUXgO` / `WMV94` / `l5IHa` / `PVrFW` (allergen
 * component family).
 */
import { Icon, type IconName } from '@/components/ui/Icon';

const ALLERGEN_ICON: Record<string, IconName> = {
  gluten: 'wheat',
  leche: 'milk',
  lactosa: 'milk',
  huevo: 'egg',
  soja: 'soy',
  pescado: 'fish',
  crustáceos: 'shrimp',
  crustaceos: 'shrimp',
  'frutos secos': 'nut',
  maní: 'nut',
  mani: 'nut',
  sésamo: 'allergen',
  sesamo: 'allergen',
  sulfitos: 'allergen',
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
          <AllergenChip key={a} name={a} />
        ))}
      </div>
    </section>
  );
}

function AllergenChip({ name }: { name: string }) {
  const iconName = resolveIcon(name);
  return (
    <span
      role="listitem"
      data-testid={`allergen-${normalizeTestId(name)}`}
      data-icon={iconName}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-danger-bg)] bg-[var(--color-danger-bg)] px-3 py-1 text-[12px] font-bold text-[var(--color-risk-high)]"
    >
      <Icon name={iconName} className="h-3.5 w-3.5" strokeWidth={2} />
      {capitalize(name)}
    </span>
  );
}

function resolveIcon(name: string): IconName {
  return ALLERGEN_ICON[name.toLowerCase()] ?? 'allergen';
}

function normalizeTestId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
