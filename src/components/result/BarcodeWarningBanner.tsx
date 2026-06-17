/**
 * <BarcodeWarningBanner> — aviso NO bloqueante sobre la foto del código de
 * barras (NL-601, validación soft):
 *   - `barcodeMismatch`: el código decodificó pero corresponde (según OFF) a
 *     otro producto que el de la foto.
 *   - `barcodeUnreadable`: el usuario subió una foto del código pero no se
 *     pudo leer.
 * El análisis igual se produjo con la foto del producto; esto solo modula la
 * confianza del usuario en el resultado.
 */
import { Icon } from '@/components/ui/Icon';

interface BarcodeWarningBannerProps {
  barcodeMismatch?: boolean;
  barcodeUnreadable?: boolean;
}

export function BarcodeWarningBanner({
  barcodeMismatch,
  barcodeUnreadable,
}: BarcodeWarningBannerProps) {
  // El mismatch es más relevante que el "no se pudo leer" → tiene prioridad.
  const message = barcodeMismatch
    ? 'El código de barras parece ser de otro producto. Revisá que ambas fotos sean del mismo envase.'
    : barcodeUnreadable
      ? 'No pudimos leer el código de barras. Analizamos solo con la foto del producto.'
      : null;

  if (!message) return null;

  return (
    <section
      role="status"
      aria-live="polite"
      data-testid="barcode-warning-banner"
      className="flex items-center gap-3 rounded-[14px] border border-[var(--color-warning-bg)] bg-[var(--color-warning-bg)] p-4"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-warning)]">
        <Icon name="scan-line" className="h-[18px] w-[18px]" />
      </span>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[14px] font-bold text-[var(--color-text)]">
          {barcodeMismatch ? 'Revisá el código de barras' : 'No leímos el código de barras'}
        </h2>
        <p className="text-[12px] text-[var(--color-text-muted)]">{message}</p>
      </div>
    </section>
  );
}
