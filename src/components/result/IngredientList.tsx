/**
 * Ingredient bullet list (spec E03 §6.1).
 */
import { Card } from '@/components/ui/Card';

export function IngredientList({ ingredients }: { ingredients: ReadonlyArray<string> }) {
  if (ingredients.length === 0) return null;
  return (
    <section aria-labelledby="ingredients-title" className="flex flex-col gap-2">
      <h2 id="ingredients-title" className="text-[14px] font-bold text-[var(--color-text)]">
        Ingredientes
      </h2>
      <Card padding="md">
        <ul
          data-testid="ingredient-list"
          className="flex list-inside list-disc flex-col gap-1 text-[13px] text-[var(--color-text)] marker:text-[var(--color-primary)]"
        >
          {ingredients.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
