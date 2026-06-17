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
          className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2"
        >
          {ingredients.map((i) => (
            <li
              key={i}
              className="flex items-center gap-2.5 text-[13px] capitalize text-[var(--color-text)]"
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-primary)]"
              />
              <span className="min-w-0 truncate">{i}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
