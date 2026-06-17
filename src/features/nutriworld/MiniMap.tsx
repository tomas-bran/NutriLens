'use client';

/**
 * Minimapa 2D (overlay DOM, no dentro del Canvas) que proyecta el mundo visto
 * desde arriba: cada góndola es una celda de su color de marca, el jugador es un
 * punto blanco y la góndola objetivo se resalta con un anillo. Lee del store
 * (`playerPos`, `npcTargetZone`) igual que el resto de los overlays.
 *
 * Proyección: x∈[-HALF,HALF] → 0..SIZE (der.), z∈[-HALF,HALF] → 0..SIZE (abajo).
 */
import { ZONE_LIST, type ZoneId } from './data/zones';
import { useNutriWorld } from './store/useNutriWorldStore';

const SIZE = 150; // lado del área de mapa, en px
const HALF = 12; // medio-extensión del mundo que entra en el mapa

/** Códigos cortos para la celda de cada góndola. */
const ZONE_SHORT: Record<ZoneId, string> = {
  sin_tacc: 'ST',
  vegano: 'VG',
  sin_lactosa: 'SL',
  snacks: 'SN',
};

function project(x: number, z: number): { left: number; top: number } {
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const nx = clamp01((x + HALF) / (2 * HALF));
  const nz = clamp01((z + HALF) / (2 * HALF));
  return { left: nx * SIZE, top: nz * SIZE };
}

export function MiniMap() {
  const player = useNutriWorld((s) => s.playerPos);
  const target = useNutriWorld((s) => s.npcTargetZone);
  const npcState = useNutriWorld((s) => s.npcState);

  const targetLabel = target ? ZONE_LIST.find((z) => z.id === target)?.label : null;
  const p = project(player.x, player.z);

  return (
    <div
      className="pointer-events-none absolute bottom-4 right-4 select-none rounded-2xl border border-white/10 bg-slate-900/85 p-2.5 shadow-xl backdrop-blur"
      data-testid="nutriworld-minimap"
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-200">Mapa</span>
        <span className="text-[10px] font-medium text-slate-400">
          {targetLabel ? `→ ${targetLabel}` : 'Explorando'}
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-lg bg-slate-800/80 ring-1 ring-inset ring-white/5"
        style={{ width: SIZE, height: SIZE }}
      >
        {/* Grilla sutil */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: `${SIZE / 4}px ${SIZE / 4}px`,
          }}
        />

        {/* Góndolas */}
        {ZONE_LIST.map((zone) => {
          const { left, top } = project(zone.position[0], zone.position[2]);
          const isTarget = zone.id === target;
          return (
            <div
              key={zone.id}
              className="absolute flex h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md text-[9px] font-bold text-white transition-all"
              style={{
                left,
                top,
                backgroundColor: zone.color,
                opacity: isTarget ? 1 : 0.55,
                boxShadow: isTarget ? `0 0 0 3px ${zone.color}66, 0 0 10px ${zone.color}` : 'none',
                transform: `translate(-50%, -50%) scale(${isTarget ? 1.15 : 1})`,
              }}
              title={zone.label}
            >
              {ZONE_SHORT[zone.id]}
            </div>
          );
        })}

        {/* Jugador */}
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900 bg-white shadow"
          style={{
            left: p.left,
            top: p.top,
            boxShadow: '0 0 0 3px rgba(255,255,255,0.25)',
          }}
        />

        {/* Pulso del jugador cuando NutriLens guía */}
        {npcState === 'guiding' && (
          <div
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-white/70"
            style={{ left: p.left, top: p.top }}
          />
        )}
      </div>
    </div>
  );
}
