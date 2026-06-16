/**
 * Centralised icon set. Hand-rolled lucide path data so we don't ship the
 * full `lucide-react` package — every icon used in the app passes through
 * this file. Adding a new one means adding a single entry to `ICON_PATHS`.
 *
 * Pencil designs reference these icons by name (e.g. `iconFontName: "camera"`
 * in the Pencil `Z2rHzQ` bottom nav). Keep the keys aligned with the lucide
 * `kebab-case` slugs so the mapping stays obvious.
 */
import type { SVGProps } from 'react';
import { cn } from '@/lib/cn';

export type IconName =
  | 'home'
  | 'scan-line'
  | 'scan-eye'
  | 'history'
  | 'chat'
  | 'camera'
  | 'image'
  | 'file-text'
  | 'cloud-upload'
  | 'upload'
  | 'check'
  | 'circle-alert'
  | 'triangle-alert'
  | 'info'
  | 'close'
  | 'shield-check'
  | 'sparkles'
  | 'line-chart'
  | 'arrow-right'
  | 'arrow-left'
  | 'filter'
  | 'pencil'
  | 'user'
  | 'logout'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'settings'
  | 'leaf'
  | 'salad'
  | 'scan-qr-code'
  | 'more-vertical'
  // Allergens — hand-rolled glyphs (no lucide equivalents).
  | 'wheat'
  | 'wheat-off'
  | 'milk'
  | 'milk-off'
  | 'egg'
  | 'vegan'
  | 'soy'
  | 'fish'
  | 'nut'
  | 'shrimp'
  | 'allergen';

interface IconPathDef {
  paths: ReadonlyArray<string>;
  circles?: ReadonlyArray<{ cx: number; cy: number; r: number }>;
  /** Lines as [x1, y1, x2, y2]. */
  lines?: ReadonlyArray<[number, number, number, number]>;
  /** Rounded rects (e.g. el cuadro del QR de `scan-qr-code`). */
  rects?: ReadonlyArray<{ x: number; y: number; w: number; h: number; rx?: number }>;
  /** Strokes that should be `fill="currentColor"` instead of `stroke=`. */
  filled?: boolean;
}

const ICON_PATHS: Record<IconName, IconPathDef> = {
  home: {
    paths: ['M3 11l9-8 9 8', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
  },
  'scan-line': {
    paths: [
      'M3 7V5a2 2 0 0 1 2-2h2',
      'M17 3h2a2 2 0 0 1 2 2v2',
      'M21 17v2a2 2 0 0 1-2 2h-2',
      'M7 21H5a2 2 0 0 1-2-2v-2',
      'M7 12h10',
    ],
  },
  'scan-eye': {
    paths: [
      'M3 7V5a2 2 0 0 1 2-2h2',
      'M17 3h2a2 2 0 0 1 2 2v2',
      'M21 17v2a2 2 0 0 1-2 2h-2',
      'M7 21H5a2 2 0 0 1-2-2v-2',
    ],
    circles: [{ cx: 12, cy: 12, r: 3 }],
  },
  history: {
    paths: ['M3 12a9 9 0 1 0 3-6.7', 'M3 4v5h5', 'M12 7v5l3 2'],
  },
  // Chat IA — dos globos de diálogo + destello. messages-square (lucide) +
  // un sparkle arriba a la derecha para el toque "asistente IA".
  chat: {
    paths: [
      'M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
      'M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1',
      'M19.5 1c.25 1.05.7 1.5 1.75 1.75-1.05.25-1.5.7-1.75 1.75-.25-1.05-.7-1.5-1.75-1.75C18.8 1.7 19.25 1.25 19.5 1z',
    ],
  },
  camera: {
    paths: [
      'M14.5 4l1.5 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2h5z',
    ],
    circles: [{ cx: 12, cy: 13, r: 3.5 }],
  },
  image: {
    paths: ['M21 15l-5-5L5 21'],
    circles: [{ cx: 9, cy: 9, r: 2 }],
    // The rect for image is custom — keep it as a path so we don't have to extend the IconPathDef.
    // Below is the rect drawn as a path.
  },
  'file-text': {
    paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
  },
  'cloud-upload': {
    paths: ['M12 13v8', 'M9 16l3-3 3 3', 'M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25'],
  },
  // Bandeja con flecha hacia arriba (lucide `upload`).
  upload: {
    paths: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  },
  check: {
    paths: ['M20 6L9 17l-5-5'],
  },
  'circle-alert': {
    paths: [],
    circles: [{ cx: 12, cy: 12, r: 10 }],
    lines: [
      [12, 8, 12, 12],
      [12, 16, 12.01, 16],
    ],
  },
  'triangle-alert': {
    paths: [
      'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
    ],
    lines: [
      [12, 9, 12, 13],
      [12, 17, 12.01, 17],
    ],
  },
  info: {
    paths: [],
    circles: [{ cx: 12, cy: 12, r: 10 }],
    lines: [
      [12, 16, 12, 12],
      [12, 8, 12.01, 8],
    ],
  },
  close: {
    paths: [],
    lines: [
      [18, 6, 6, 18],
      [6, 6, 18, 18],
    ],
  },
  'shield-check': {
    paths: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  },
  sparkles: {
    paths: [
      'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z',
      'M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
      'M5 17l.5 1.5 1.5.5-1.5.5L5 21l-.5-1.5L3 19l1.5-.5z',
    ],
  },
  'line-chart': {
    paths: ['M3 3v18h18', 'M7 16l4-6 4 3 5-8'],
  },
  'arrow-right': {
    paths: ['M5 12h14', 'M13 5l7 7-7 7'],
  },
  'arrow-left': {
    paths: ['M19 12H5', 'm12 19-7-7 7-7'],
  },
  // Funnel — filtros.
  filter: {
    paths: ['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'],
  },
  // Pencil — editar / renombrar. Path data oficial de lucide `pencil`.
  pencil: {
    paths: [
      'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
      'm15 5 4 4',
    ],
  },
  user: {
    paths: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'],
    circles: [{ cx: 12, cy: 7, r: 4 }],
  },
  logout: {
    paths: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  },
  'chevron-right': {
    paths: ['M9 18l6-6-6-6'],
  },
  'chevron-left': {
    paths: ['m15 18-6-6 6-6'],
  },
  'chevron-down': {
    paths: ['M6 9l6 6 6-6'],
  },
  settings: {
    paths: [
      'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
    ],
    circles: [{ cx: 12, cy: 12, r: 3 }],
  },
  leaf: {
    paths: [
      'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z',
      'M2 21c0-3 1.85-5.36 5.08-6',
    ],
  },
  // Salad — catálogo de productos. Path data oficial de lucide `salad`.
  salad: {
    paths: [
      'M7 21h10',
      'M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z',
      'M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1',
      'm13 12 4-4',
      'M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2',
    ],
  },
  // Scan QR — lente de escaneo del login. Path data oficial de lucide `scan-qr-code`.
  'scan-qr-code': {
    paths: [
      'M17 12v4a1 1 0 0 1-1 1h-4',
      'M17 3h2a2 2 0 0 1 2 2v2',
      'M17 8V7',
      'M21 17v2a2 2 0 0 1-2 2h-2',
      'M3 7V5a2 2 0 0 1 2-2h2',
      'M7 17h.01',
      'M7 21H5a2 2 0 0 1-2-2v-2',
    ],
    rects: [{ x: 7, y: 7, w: 5, h: 5, rx: 1 }],
  },
  // Kebab — menú de tres puntos. Path data oficial de lucide `ellipsis-vertical`.
  'more-vertical': {
    paths: [],
    circles: [
      { cx: 12, cy: 12, r: 1 },
      { cx: 12, cy: 5, r: 1 },
      { cx: 12, cy: 19, r: 1 },
    ],
  },
  // Wheat ear — gluten allergen. Path data oficial de lucide `wheat`
  // (lucide-static v1.18.0) — espigas en diagonal sobre el tallo.
  wheat: {
    paths: [
      'M2 22 16 8',
      'M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
      'M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
      'M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
      'M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z',
      'M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
      'M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
      'M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
    ],
  },
  // Wheat-off — "sin gluten / sin TACC". Path data oficial de lucide `wheat-off`.
  'wheat-off': {
    paths: [
      'm2 22 10-10',
      'm16 8-1.17 1.17',
      'M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
      'm8 8-.53.53a3.5 3.5 0 0 0 0 4.94L9 15l1.53-1.53c.55-.55.88-1.25.98-1.97',
      'M10.91 5.26c.15-.26.34-.51.56-.73L13 3l1.53 1.53a3.5 3.5 0 0 1 .28 4.62',
      'M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z',
      'M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
      'm16 16-.53.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.49 3.49 0 0 1 1.97-.98',
      'M18.74 13.09c.26-.15.51-.34.73-.56L21 11l-1.53-1.53a3.5 3.5 0 0 0-4.62-.28',
    ],
    lines: [[2, 2, 22, 22]],
  },
  // Milk carton — leche allergen.
  milk: {
    paths: ['M8 2h8', 'M8 2v3l-2 3v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8l-2-3V2', 'M8 14h8'],
  },
  // Milk-off — "sin lactosa". Path data oficial de lucide `milk-off`.
  'milk-off': {
    paths: [
      'M8 2h8',
      'M9 2v1.343M15 2v2.789a4 4 0 0 0 .672 2.219l.656.984a4 4 0 0 1 .672 2.22v1.131M7.8 7.8l-.128.192A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3',
      'M7 15a6.47 6.47 0 0 1 5 0 6.472 6.472 0 0 0 3.435.435',
    ],
    lines: [[2, 2, 22, 22]],
  },
  // Egg — huevo allergen.
  egg: {
    paths: ['M12 22a7 7 0 0 1-7-7c0-5 3-13 7-13s7 8 7 13a7 7 0 0 1-7 7z'],
  },
  // Vegan — sello "vegano". Path data oficial de lucide `vegan`.
  vegan: {
    paths: [
      'M16 8q6 0 6-6-6 0-6 6',
      'M17.41 3.59a10 10 0 1 0 3 3',
      'M2 2a26.6 26.6 0 0 1 10 20c.9-6.82 1.5-9.5 4-14',
    ],
  },
  // Soy bean — soja allergen. Two beans inside a pod.
  soy: {
    paths: ['M4 12c0-5 4-9 9-9 5 0 7 4 7 8s-2 9-7 9-9-3-9-8z'],
    circles: [
      { cx: 10, cy: 10, r: 1.5 },
      { cx: 14, cy: 14, r: 1.5 },
    ],
  },
  // Fish — pescado allergen.
  fish: {
    paths: [
      'M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6z',
      'M18 12v.5',
      'M2 12c2-1 4-1 6 0',
      'M2 12c2 1 4 1 6 0',
    ],
  },
  // Walnut / generic nut — frutos secos / maní.
  nut: {
    paths: ['M12 2C7 2 4 6 4 11s3 9 8 11c5-2 8-6 8-11s-3-9-8-9z', 'M12 2v20', 'M8 8c2 2 6 2 8 0'],
  },
  // Shrimp — crustáceos.
  shrimp: {
    paths: [
      'M3 13c0-3 3-6 7-6h5a4 4 0 0 1 4 4v2',
      'M19 13c0 3-3 6-7 6H5l3-3',
      'M9 9l-2-2',
      'M12 9l-2-2',
    ],
  },
  // Generic allergen — fallback for sulfitos / sésamo / unmapped values.
  allergen: {
    paths: [
      'M12 9v4',
      'M12 17h.01',
      'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
    ],
  },
};

// `image` icon needs a rect; rather than extending IconPathDef, we paint it
// as a separate node when name === 'image'. Keeping the special-case here
// avoids polluting the shape for every other icon.
const IMAGE_RECT = { x: 3, y: 3, w: 18, h: 18, rx: 2 } as const;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'viewBox'> {
  name: IconName;
  /** Stroke width override. Defaults to 2. */
  strokeWidth?: number;
  /** Override the className with custom Tailwind sizing classes (e.g. `h-6 w-6`). */
  className?: string;
}

export function Icon({ name, strokeWidth = 2, className, ...rest }: IconProps) {
  const def = ICON_PATHS[name];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={def.filled ? 'currentColor' : 'none'}
      stroke={def.filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-5 w-5', className)}
      {...rest}
    >
      {name === 'image' && (
        <rect
          x={IMAGE_RECT.x}
          y={IMAGE_RECT.y}
          width={IMAGE_RECT.w}
          height={IMAGE_RECT.h}
          rx={IMAGE_RECT.rx}
        />
      )}
      {def.paths.map((d) => (
        <path key={d} d={d} />
      ))}
      {def.circles?.map((c) => (
        <circle key={`${c.cx}-${c.cy}-${c.r}`} cx={c.cx} cy={c.cy} r={c.r} />
      ))}
      {def.rects?.map((r) => (
        <rect
          key={`${r.x}-${r.y}-${r.w}-${r.h}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          rx={r.rx}
        />
      ))}
      {def.lines?.map(([x1, y1, x2, y2]) => (
        <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
    </svg>
  );
}
