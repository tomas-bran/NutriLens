'use client';

/**
 * <HeroDecor> — lente/cámara del hero con los chips de aptitudes orbitándolo.
 *
 * NL-504 + feedback: los chips se pueden ARRASTRAR (pointer events, mouse +
 * touch) sin perder la animación de flotar. El truco es el anidado: el div
 * externo lleva el offset del drag (`transform: translate`) y el interno tiene
 * la animación `home-float` (`transform: translateY`) — como son transforms en
 * elementos distintos, se componen y la flotación sigue mientras se arrastra.
 *
 * Visible en todos los viewports (antes era `hidden md:flex`): en mobile el
 * diseño de Claude Design también muestra la cámara.
 */
import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';

/** Cada anillo arranca su expansión con un desfasaje distinto (ola continua). */
const PULSE_RINGS = ['1.2s', '2.4s', '4.8s'];

interface ChipDef {
  icon: IconName;
  label: string;
  top: string;
  left: string;
  delay: string;
  duration: string;
}

/** Posiciones de los chips relativas al lente (las fijó Federico). */
const LENS_CHIPS: ReadonlyArray<ChipDef> = [
  { icon: 'wheat-off', label: 'Sin gluten', top: '-14%', left: '64%', delay: '0s', duration: '6s' },
  { icon: 'vegan', label: 'Vegano', top: '-4%', left: '-40%', delay: '0.6s', duration: '6.5s' },
  { icon: 'nut', label: 'Frutos secos', top: '46%', left: '92%', delay: '2s', duration: '7.5s' },
  {
    icon: 'milk-off',
    label: 'Sin lactosa',
    top: '96%',
    left: '-52%',
    delay: '1.2s',
    duration: '7s',
  },
];

export function HeroDecor() {
  return (
    <div className="flex items-center justify-center">
      {/* `pointer-events-none` en el decorado del lente; los chips lo reactivan
          (`pointer-events-auto`) para poder arrastrarlos. */}
      <div className="pointer-events-none relative h-44 w-44">
        <div className="absolute inset-0 rounded-full bg-white/10" />
        <div className="absolute inset-5 rounded-full bg-white/20" />
        {PULSE_RINGS.map((delay) => (
          <span
            key={delay}
            className="nl-pulse-ring absolute inset-10 rounded-full border-2 border-white/70"
            style={{ animationDelay: delay }}
          />
        ))}
        <div className="absolute inset-10 flex items-center justify-center rounded-full bg-white shadow-[0_8px_24px_0_rgba(0,0,0,0.12)]">
          <Icon name="camera" className="h-12 w-12 text-[var(--color-primary)]" />
        </div>

        {LENS_CHIPS.map((chip) => (
          <DraggableChip key={chip.label} chip={chip} />
        ))}
      </div>
    </div>
  );
}

function DraggableChip({ chip }: { chip: ChipDef }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null,
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setOffset({ x: d.baseX + (e.clientX - d.startX), y: d.baseY + (e.clientY - d.startY) });
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      // Externo: offset del drag (no animado). `touch-none` evita el scroll al
      // arrastrar en mobile; `z-20` lo trae al frente mientras se mueve.
      className="pointer-events-auto absolute touch-none select-none whitespace-nowrap"
      style={{
        top: chip.top,
        left: chip.left,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        zIndex: dragging ? 20 : undefined,
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Interno: la animación de flotar (transform propio, se compone con el
          offset del padre → el chip flota aunque lo hayas movido). */}
      <div
        className="home-float"
        style={{ animationDelay: chip.delay, animationDuration: chip.duration }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-[var(--color-primary-strong)] shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur">
          <Icon name={chip.icon} className="h-3.5 w-3.5" />
          {chip.label}
        </span>
      </div>
    </div>
  );
}
