/**
 * Zonas (góndolas) de NutriWorld. Posiciones fijas en el plano para que el NPC
 * pueda ir en línea recta (sin pathfinding, beta). `[x, y, z]` en unidades de
 * Three.js; `y` siempre 0 (piso). El color tiñe el cartel + el estante.
 */
export type ZoneId = 'sin_tacc' | 'vegano' | 'sin_lactosa' | 'snacks';

export interface Zone {
  id: ZoneId;
  label: string;
  position: [number, number, number];
  /** Color de marca de la góndola (cartel + frente del estante). */
  color: string;
}

export const ZONES: Record<ZoneId, Zone> = {
  sin_tacc: { id: 'sin_tacc', label: 'Sin TACC', position: [8, 0, -4], color: '#16a34a' },
  vegano: { id: 'vegano', label: 'Vegano', position: [-8, 0, 4], color: '#65a30d' },
  sin_lactosa: { id: 'sin_lactosa', label: 'Sin lactosa', position: [4, 0, 8], color: '#0ea5e9' },
  snacks: { id: 'snacks', label: 'Snacks', position: [-6, 0, -2], color: '#f59e0b' },
};

export const ZONE_LIST: readonly Zone[] = Object.values(ZONES);

export function zoneLabel(id: ZoneId | null | undefined): string {
  return id ? ZONES[id].label : '';
}
