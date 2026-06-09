'use client';

/**
 * `<FilterSelect>` — combobox accesible para filtros del historial (US-24).
 *
 * Construido sobre `@radix-ui/react-select`: trigger custom + listbox flotante,
 * navegable por teclado y compatible con lectores de pantalla. Reemplaza el
 * `<select>` nativo viejo cuyo dropdown del SO no respetaba los tokens del
 * design system y se veía ajeno en mobile.
 *
 * API:
 *  - `value=""` significa "sin filtro" (la opción "Todas").
 *  - `onValueChange` recibe el string directo (no un event) — la UI no necesita
 *    saber del shape del evento del DOM.
 *  - El trigger tiene `data-testid={testId}` y `data-value` con el valor
 *    actual, así POM / unit tests pueden assertear sin abrir el listbox.
 *
 * Accesibilidad: Radix expone roles `combobox` (trigger) + `listbox`
 * (content) + `option` (items) automáticamente, plus `aria-expanded`,
 * `aria-activedescendant`, navegación con flechas, escape para cerrar.
 */
import * as Select from '@radix-ui/react-select';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

const ALL_VALUE = '__all__';

export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterSelectProps {
  label: string;
  value: string;
  onValueChange: (next: string) => void;
  options: ReadonlyArray<FilterSelectOption>;
  testId: string;
  /** Texto del item "limpiar filtro". Default: "Todas". */
  allLabel?: string;
}

export function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  testId,
  allLabel = 'Todas',
}: FilterSelectProps) {
  const active = value !== '';
  // Radix no permite `value=""` en `Select.Item`: usamos un sentinel `__all__`
  // y lo traducimos en ambas direcciones.
  const radixValue = active ? value : ALL_VALUE;
  const handleChange = (next: string) => {
    onValueChange(next === ALL_VALUE ? '' : next);
  };

  return (
    <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
      {label}
      <Select.Root value={radixValue} onValueChange={handleChange}>
        <Select.Trigger
          data-testid={testId}
          data-value={value}
          aria-label={label}
          className={cn(
            'inline-flex min-w-[140px] items-center justify-between gap-2 rounded-full border bg-white px-3 py-2 text-[13px] font-medium capitalize transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
            active
              ? 'border-[var(--color-primary)] text-[var(--color-primary-strong)]'
              : 'border-[var(--color-border)] text-[var(--color-text)]',
          )}
        >
          <Select.Value placeholder={allLabel} />
          <Select.Icon asChild>
            <Icon name="arrow-right" className="h-3.5 w-3.5 rotate-90 opacity-70" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            data-testid={`${testId}-content`}
            position="popper"
            sideOffset={4}
            className={cn(
              'z-50 min-w-[160px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-lg',
              'animate-in fade-in-0 zoom-in-95',
            )}
          >
            <Select.Viewport className="p-1">
              <FilterItem value={ALL_VALUE} testId={`${testId}-option-all`}>
                {allLabel}
              </FilterItem>
              <Select.Separator className="my-1 h-px bg-[var(--color-border)]" />
              {options.map((opt) => (
                <FilterItem
                  key={opt.value}
                  value={opt.value}
                  testId={`${testId}-option-${opt.value}`}
                >
                  {opt.label}
                </FilterItem>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </label>
  );
}

function FilterItem({
  value,
  testId,
  children,
}: {
  value: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <Select.Item
      value={value}
      data-testid={testId}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium capitalize text-[var(--color-text)] outline-none',
        'data-[highlighted]:bg-[var(--color-bg)]',
        'data-[state=checked]:bg-[var(--color-primary-soft)] data-[state=checked]:text-[var(--color-primary-strong)]',
      )}
    >
      <Select.ItemIndicator>
        <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />
      </Select.ItemIndicator>
      <Select.ItemText>{children}</Select.ItemText>
    </Select.Item>
  );
}
