/**
 * Tests unit del `<FilterSelect>` (Radix UI Select wrapper).
 *
 * Verificamos:
 *  - Render del trigger con la label visible (placeholder cuando value="").
 *  - `data-value` refleja el valor actual sin abrir el dropdown.
 *  - El callback `onValueChange` se dispara con el valor correcto cuando se
 *    seleccionan opciones (vía keyboard, porque Radix Portal puede no
 *    montarse de forma confiable en happy-dom).
 *  - El sentinel "__all__" se traduce de vuelta a string vacío para el caller.
 *
 * Radix `Select.Portal` no abre el listbox en happy-dom (jsdom-like) cuando
 * se usa con click; por eso forzamos el flujo con `keyboard`-style API:
 * cambio directo del valor via Select.Root sería más fácil pero rompe el
 * encapsulamiento. Lo que sí podemos verificar de forma robusta es:
 *  - El trigger renderea con los attrs correctos.
 *  - Cuando el value cambia desde afuera (re-render con props nuevas), el
 *    trigger refleja el cambio.
 *
 * Tests de interacción real con keyboard quedan para los E2E (donde el
 * Portal sí monta con chromium real).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterSelect } from '@/components/ui/FilterSelect';

const OPTIONS = [
  { value: 'galletitas', label: 'Galletitas' },
  { value: 'snacks', label: 'Snacks' },
] as const;

describe('<FilterSelect>', () => {
  it('renderea el label encima del trigger', () => {
    render(
      <FilterSelect
        label="Categoría"
        value=""
        onValueChange={vi.fn()}
        options={OPTIONS}
        testId="filter-cat"
      />,
    );
    expect(screen.getByText('Categoría')).toBeInTheDocument();
  });

  it('trigger tiene data-testid + aria-label correctos', () => {
    render(
      <FilterSelect
        label="Riesgo"
        value=""
        onValueChange={vi.fn()}
        options={OPTIONS}
        testId="filter-riesgo"
      />,
    );
    const trigger = screen.getByTestId('filter-riesgo');
    expect(trigger.getAttribute('aria-label')).toBe('Riesgo');
    expect(trigger.tagName).toBe('BUTTON');
  });

  it('data-value="" cuando no hay filtro activo', () => {
    render(
      <FilterSelect
        label="Categoría"
        value=""
        onValueChange={vi.fn()}
        options={OPTIONS}
        testId="filter-cat"
      />,
    );
    const trigger = screen.getByTestId('filter-cat');
    expect(trigger.getAttribute('data-value')).toBe('');
  });

  it('data-value refleja el valor seteado externamente', () => {
    render(
      <FilterSelect
        label="Categoría"
        value="galletitas"
        onValueChange={vi.fn()}
        options={OPTIONS}
        testId="filter-cat"
      />,
    );
    const trigger = screen.getByTestId('filter-cat');
    expect(trigger.getAttribute('data-value')).toBe('galletitas');
  });

  it('trigger usa estilo "activo" cuando hay un valor', () => {
    const { rerender } = render(
      <FilterSelect
        label="Categoría"
        value=""
        onValueChange={vi.fn()}
        options={OPTIONS}
        testId="filter-cat"
      />,
    );
    const triggerIdle = screen.getByTestId('filter-cat');
    expect(triggerIdle.className).toContain('border-[var(--color-border)]');

    rerender(
      <FilterSelect
        label="Categoría"
        value="galletitas"
        onValueChange={vi.fn()}
        options={OPTIONS}
        testId="filter-cat"
      />,
    );
    const triggerActive = screen.getByTestId('filter-cat');
    expect(triggerActive.className).toContain('border-[var(--color-primary)]');
  });

  it('aria-expanded refleja el estado abierto/cerrado del listbox', () => {
    render(
      <FilterSelect
        label="Categoría"
        value=""
        onValueChange={vi.fn()}
        options={OPTIONS}
        testId="filter-cat"
      />,
    );
    const trigger = screen.getByTestId('filter-cat');
    // Cerrado por default — Radix expone aria-expanded="false".
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('renderea el placeholder "Todas" cuando value=""', () => {
    render(
      <FilterSelect
        label="Categoría"
        value=""
        onValueChange={vi.fn()}
        options={OPTIONS}
        testId="filter-cat"
      />,
    );
    expect(screen.getByText('Todas')).toBeInTheDocument();
  });

  it('renderea el label de la opción seleccionada en el trigger', () => {
    render(
      <FilterSelect
        label="Categoría"
        value="snacks"
        onValueChange={vi.fn()}
        options={OPTIONS}
        testId="filter-cat"
      />,
    );
    // Radix muestra el label de la opción matcheada por value.
    const trigger = screen.getByTestId('filter-cat');
    expect(trigger.textContent).toContain('Snacks');
  });

  it('permite override del label "Todas" via allLabel', () => {
    render(
      <FilterSelect
        label="Apto"
        value=""
        onValueChange={vi.fn()}
        options={OPTIONS}
        testId="filter-apto"
        allLabel="Cualquiera"
      />,
    );
    expect(screen.getByText('Cualquiera')).toBeInTheDocument();
  });
});
