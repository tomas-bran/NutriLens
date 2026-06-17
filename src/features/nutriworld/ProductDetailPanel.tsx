'use client';

/**
 * Ficha 2D del producto seleccionado (se abre con E al estar cerca, o click).
 * Replica el lenguaje visual de la vista de resultado real de NutriLens: hero de
 * riesgo tintado, "Aptitud por dieta" con íconos, ingredientes, alérgenos con
 * glyphs y los sellos regulatorios (octágono negro Ley 27.642) en versión chica.
 */
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { getProductById } from './data/products';
import type { NutriProduct, Risk } from './data/products';
import { selectProduct, useNutriWorld } from './store/useNutriWorldStore';

const RISK_META: Record<Risk, { label: string; bg: string; fg: string; ring: string }> = {
  bajo: { label: 'Riesgo bajo', bg: '#dcfce7', fg: '#15803d', ring: '#16a34a' },
  medio: { label: 'Riesgo medio', bg: '#fef3c7', fg: '#b45309', ring: '#f59e0b' },
  alto: { label: 'Riesgo alto', bg: '#fee2e2', fg: '#b91c1c', ring: '#ef4444' },
};

// Sellos regulatorios: prefijo + nutriente para maquetar en dos líneas.
const SELLO_PARTS: Record<string, { line1: string; line2: string }> = {
  'exceso en azúcares': { line1: 'Exceso en', line2: 'Azúcares' },
  'exceso en grasas saturadas': { line1: 'Exceso en', line2: 'Grasas sat.' },
  'exceso en grasas totales': { line1: 'Exceso en', line2: 'Grasas' },
  'exceso en sodio': { line1: 'Exceso en', line2: 'Sodio' },
  'exceso en calorías': { line1: 'Exceso en', line2: 'Calorías' },
};

const OCTAGON_CLIP_PATH =
  'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';

const ALLERGEN_ICON: Record<string, IconName> = {
  gluten: 'wheat',
  leche: 'milk',
  lactosa: 'milk',
  huevo: 'egg',
  soja: 'soy',
  pescado: 'fish',
  crustáceos: 'shrimp',
  'frutos secos': 'nut',
  maní: 'nut',
};

export function ProductDetailPanel() {
  const selectedId = useNutriWorld((s) => s.selectedProductId);
  const product = selectedId ? getProductById(selectedId) : undefined;
  if (!product) return null;

  const risk = RISK_META[product.risk];

  return (
    <div
      data-testid="nutriworld-detail"
      className="pointer-events-auto absolute bottom-24 right-4 top-4 flex w-[min(92vw,360px)] flex-col gap-4 overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-2xl"
      role="dialog"
      aria-label={`Ficha de ${product.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-extrabold leading-tight text-[var(--color-text)]">
          {product.name}
        </h2>
        <button
          type="button"
          onClick={() => selectProduct(null)}
          aria-label="Cerrar ficha"
          data-testid="nutriworld-detail-close"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      {/* Hero de riesgo (tarjeta tintada) */}
      <section
        className="rounded-[22px] px-4 py-4 text-center"
        style={{ background: risk.bg, border: `1px solid ${risk.ring}33` }}
        data-testid="nutriworld-detail-risk"
        data-risk={product.risk}
      >
        <h3 className="text-[19px] font-extrabold" style={{ color: risk.fg }}>
          {risk.label}
        </h3>
        <p className="mt-1 text-[12.5px] font-medium opacity-80" style={{ color: risk.fg }}>
          {buildReason(product)}
        </p>
      </section>

      {/* Aptitud por dieta */}
      <section className="flex flex-col gap-2.5">
        <SectionTitle>Aptitud por dieta</SectionTitle>
        <div className="grid gap-2">
          <AptRow icon="leaf" label="Vegano" ok={product.aptoVegano} />
          <AptRow icon="wheat" label="Apto celíaco" ok={product.aptoCeliaco} />
          <AptRow icon="milk" label="Sin lactosa" ok={product.aptoSinLactosa} />
        </div>
      </section>

      {/* Ingredientes */}
      <section className="flex flex-col gap-2">
        <SectionTitle>Ingredientes</SectionTitle>
        <ul className="grid grid-cols-1 gap-1.5 rounded-2xl border border-[var(--color-border)] bg-white p-3.5">
          {product.ingredients.map((i) => (
            <li
              key={i}
              className="flex items-center gap-2.5 text-[13px] capitalize text-[var(--color-text)]"
            >
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-primary)]" />
              <span className="min-w-0">{i}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Alérgenos */}
      <section className="flex flex-col gap-2">
        <SectionTitle>Alérgenos</SectionTitle>
        {product.allergens.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {product.allergens.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-danger-bg)] bg-[var(--color-danger-bg)] px-3 py-1 text-[12px] font-bold text-[var(--color-risk-high)]"
              >
                <Icon name={ALLERGEN_ICON[a.toLowerCase()] ?? 'allergen'} className="h-3.5 w-3.5" />
                {capitalize(a)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[var(--color-text-muted)]">Sin alérgenos declarados.</p>
        )}
      </section>

      {/* Sellos (octágono regulatorio, versión chica) */}
      <section className="flex flex-col gap-2">
        <SectionTitle>Sellos</SectionTitle>
        {product.seals.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            {product.seals.map((s) => (
              <SelloBadgeSmall key={s} sello={s} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[var(--color-text-muted)]">Sin sellos de advertencia.</p>
        )}
      </section>

      {/* Por qué */}
      <section className="flex flex-col gap-2">
        <SectionTitle>Por qué</SectionTitle>
        <p className="text-[13px] leading-relaxed text-[var(--color-text)]">
          {product.explanation}
        </p>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-extrabold uppercase tracking-[1px] text-[var(--color-text-muted)]">
      {children}
    </h3>
  );
}

function AptRow({ icon, label, ok }: { icon: IconName; label: string; ok: boolean }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-3.5 py-2.5"
      data-apto={ok ? 'true' : 'false'}
    >
      <span
        className={cn(
          'flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-xl',
          ok
            ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
            : 'bg-[#fef2f2] text-[var(--color-danger)]',
        )}
      >
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <div className="flex-1">
        <div className="text-[14px] font-semibold text-[var(--color-text)]">{label}</div>
        <div
          className={cn(
            'text-[12px] font-semibold',
            ok ? 'text-[var(--color-primary-strong)]' : 'text-[var(--color-danger)]',
          )}
        >
          {ok ? 'Apto' : 'No apto'}
        </div>
      </div>
      <span
        className={cn(
          'flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-full text-white',
          ok ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-danger)]',
        )}
      >
        <Icon name={ok ? 'check' : 'close'} className="h-[14px] w-[14px]" strokeWidth={3} />
      </span>
    </div>
  );
}

/** Octágono negro regulatorio (Ley 27.642), versión compacta para la ficha. */
function SelloBadgeSmall({ sello }: { sello: string }) {
  const parts = SELLO_PARTS[sello] ?? { line1: 'Exceso', line2: sello.replace(/^exceso en /i, '') };
  return (
    <span
      aria-label={`Sello: ${sello}`}
      className="flex h-[72px] w-[72px] items-center justify-center bg-[var(--color-ink-900)] p-[2px]"
      style={{ clipPath: OCTAGON_CLIP_PATH }}
    >
      <span
        className="flex h-full w-full items-center justify-center bg-white p-[2px]"
        style={{ clipPath: OCTAGON_CLIP_PATH }}
      >
        <span
          className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-[var(--color-ink-900)] px-0.5 text-center text-white"
          style={{ clipPath: OCTAGON_CLIP_PATH }}
        >
          <span className="text-[6.5px] font-bold uppercase leading-none tracking-wide">
            {parts.line1}
          </span>
          <span className="text-[8.5px] font-extrabold uppercase leading-none">{parts.line2}</span>
          <span className="mt-0.5 text-[4.5px] font-medium uppercase leading-none tracking-wider text-white/80">
            Ministerio
            <br />
            de Salud
          </span>
        </span>
      </span>
    </span>
  );
}

function buildReason(product: NutriProduct): string {
  const parts: string[] = [];
  if (product.allergens.length > 0) parts.push(`alérgenos: ${product.allergens.join(', ')}`);
  if (product.seals.length > 0) {
    parts.push(`${product.seals.length} ${product.seals.length === 1 ? 'sello' : 'sellos'}`);
  }
  return parts.length ? `Por ${parts.join(' y ')}.` : 'Sin advertencias detectadas.';
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
