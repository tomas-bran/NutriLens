/**
 * <AptitudeRows> (rediseño Claude Design) — "Aptitud por dieta": tres filas
 * (vegano / celíaco / sin lactosa) con ícono, etiqueta, estado Apto/No apto y
 * un círculo check/✗. Reemplaza a los chips planos en la vista de resultado.
 */
import { Icon, type IconName } from '@/components/ui/Icon';
import type { ProductDetail } from '@/lib/products/serializers';

export function AptitudeRows({ product }: { product: ProductDetail }) {
  return (
    <section aria-labelledby="aptitudes-title" className="flex flex-col gap-2.5">
      <h2
        id="aptitudes-title"
        className="text-[11.5px] font-extrabold uppercase tracking-[1px] text-[var(--color-text-muted)]"
      >
        Aptitud por dieta
      </h2>
      <div className="grid gap-2.5" data-testid="aptitudes-chips" role="list">
        <AptRow kind="vegano" icon="leaf" label="Vegano" ok={product.aptoVegano} />
        <AptRow kind="celiaco" icon="wheat" label="Apto celíaco" ok={product.aptoCeliaco} />
        <AptRow kind="sin_lactosa" icon="milk" label="Sin lactosa" ok={product.aptoSinLactosa} />
      </div>
    </section>
  );
}

function AptRow({
  kind,
  icon,
  label,
  ok,
}: {
  kind: string;
  icon: IconName;
  label: string;
  ok: boolean;
}) {
  return (
    <div
      role="listitem"
      data-testid={`aptitude-${kind}`}
      data-apto={ok ? 'true' : 'false'}
      className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-3.5 py-3"
    >
      <span
        className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl ${
          ok
            ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
            : 'bg-[#fef2f2] text-[var(--color-danger)]'
        }`}
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <div className="text-[14.5px] font-semibold text-[var(--color-text)]">{label}</div>
        <div
          className={`text-[12.5px] font-semibold ${
            ok ? 'text-[var(--color-primary-strong)]' : 'text-[var(--color-danger)]'
          }`}
        >
          {ok ? 'Apto' : 'No apto'}
        </div>
      </div>
      <span
        className={`flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full text-white ${
          ok ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-danger)]'
        }`}
      >
        <Icon name={ok ? 'check' : 'close'} className="h-[15px] w-[15px]" strokeWidth={3} />
      </span>
    </div>
  );
}
