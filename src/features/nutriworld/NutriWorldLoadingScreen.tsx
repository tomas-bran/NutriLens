'use client';

/**
 * Pantalla de carga de NutriWorld: logo grande + barra de progreso, alineada
 * con la identidad de la app (gradiente de marca `home-gradient`, NutriMark,
 * tipografía Inter). `indeterminate` muestra una barra animada (fase de
 * descarga del chunk); si no, la barra refleja `progress` (0-100).
 */
import { Icon } from '@/components/ui/Icon';
import { NutriMark } from '@/components/ui/NutriMark';

interface Props {
  progress?: number;
  indeterminate?: boolean;
}

export function NutriWorldLoadingScreen({ progress = 0, indeterminate = false }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="home-gradient absolute inset-0 z-50 flex flex-col items-center justify-center gap-8 overflow-hidden text-white">
      {/* destellos sutiles de fondo */}
      <Icon
        name="sparkles"
        className="absolute left-[18%] top-[22%] h-6 w-6 text-white/30"
        fill="currentColor"
        strokeWidth={0}
      />
      <Icon
        name="sparkles"
        className="absolute right-[20%] top-[30%] h-4 w-4 text-white/25"
        fill="currentColor"
        strokeWidth={0}
      />
      <Icon
        name="sparkles"
        className="absolute bottom-[26%] left-[28%] h-5 w-5 text-white/20"
        fill="currentColor"
        strokeWidth={0}
      />

      <div className="flex flex-col items-center gap-5">
        <span className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/15 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] backdrop-blur">
          <NutriMark size={56} />
        </span>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-5xl font-extrabold tracking-tight md:text-6xl">NutriWorld</h1>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur">
              beta
            </span>
          </div>
          <p className="text-sm text-white/85 md:text-base">
            Tu góndola inteligente — explorá el súper con NutriLens
          </p>
        </div>
      </div>

      <div className="flex w-64 flex-col items-center gap-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
          {indeterminate ? (
            <div className="nutriworld-loader-indeterminate h-full w-1/3 rounded-full bg-gradient-to-r from-white to-[var(--color-accent-lime)]" />
          ) : (
            <div
              className="h-full rounded-full bg-gradient-to-r from-white to-[var(--color-accent-lime)] transition-[width] duration-200 ease-out"
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
        <span className="font-mono text-xs text-white/80">
          {indeterminate ? 'Cargando el mundo…' : `${pct}%`}
        </span>
      </div>
    </div>
  );
}
