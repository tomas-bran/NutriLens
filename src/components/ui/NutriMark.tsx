/**
 * <NutriMark> — marca de NutriLens: una hoja enmarcada por un lente/apertura
 * de cámara con un destello lima. Une "Nutri" (hoja) y "Lens" (lente).
 * Reemplaza el ícono `scan-eye` genérico en los brand tiles (login, sidebar,
 * home, header mobile). Diseño de Claude Design (handoff 2026-06-13).
 *
 * Colores self-contained (hoja blanca por defecto) para leer sobre los tiles
 * verdes; `vein`/`leaf`/`spark` permiten variar para fondos claros.
 */
interface NutriMarkProps {
  size?: number;
  /** Color de la hoja (default blanco, para tiles verdes). */
  leaf?: string;
  /** Color de las nervaduras. */
  vein?: string;
  /** Color del destello de foco. */
  spark?: string;
  className?: string;
}

export function NutriMark({
  size = 24,
  leaf = '#ffffff',
  vein = '#15803d',
  spark = '#a3e635',
  className,
}: NutriMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ display: 'block' }}
    >
      {/* lente / anillo de apertura */}
      <circle cx="16" cy="16" r="12.4" stroke={leaf} strokeWidth="1.7" fill="none" opacity="0.5" />
      {/* cuerpo de la hoja */}
      <path d="M8.6 23.4C8.2 14.6 13.4 8.8 23.4 8.6 23.8 17.4 18.6 23.2 8.6 23.4Z" fill={leaf} />
      {/* nervadura central */}
      <path
        d="M11.4 20.6C14.8 16.4 17.8 13.4 20.4 11.6"
        stroke={vein}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* nervaduras laterales */}
      <path
        d="M16.3 15.7C16.9 14 17.8 12.9 19 12.1M14.2 17.9C14.6 16.5 15.2 15.6 16 15"
        stroke={vein}
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* destello de foco */}
      <circle cx="24.6" cy="7.4" r="2.1" fill={spark} />
    </svg>
  );
}
