'use client';

/**
 * <RiskGauge> (rediseño Claude Design) — semicírculo con tres tramos
 * (verde/ámbar/rojo) y una aguja que apunta al nivel de riesgo, animándose
 * desde el centro al montar. Reemplaza al banner plano como "hero" del riesgo.
 *
 * Client por la animación de la aguja (de -90° al ángulo del riesgo). Respeta
 * prefers-reduced-motion vía `nl-gauge-needle` (sin transición si está activo).
 */
import { useEffect, useState } from 'react';
import type { Riesgo } from '@schemas/product';

const RISK_META: Record<Riesgo, { angle: number; ring: string; fg: string }> = {
  bajo: { angle: -58, ring: '#16a34a', fg: '#15803d' },
  medio: { angle: 0, ring: '#f59e0b', fg: '#b45309' },
  alto: { angle: 58, ring: '#ef4444', fg: '#b91c1c' },
};

const SIZE = 196;
const H = SIZE * 0.6;
const CX = SIZE / 2;
const CY = H - 12;
const RAD = SIZE * 0.42;
const SW = SIZE * 0.085;

function pol(a: number): [number, number] {
  const r = (a * Math.PI) / 180;
  return [CX + RAD * Math.sin(r), CY - RAD * Math.cos(r)];
}

function arc(a0: number, a1: number): string {
  const [x0, y0] = pol(a0);
  const [x1, y1] = pol(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${RAD} ${RAD} 0 ${large} 1 ${x1} ${y1}`;
}

export function RiskGauge({ risk }: { risk: Riesgo }) {
  const meta = RISK_META[risk];
  const [angle, setAngle] = useState(-90);
  useEffect(() => {
    const t = setTimeout(() => setAngle(meta.angle), 120);
    return () => clearTimeout(t);
  }, [meta.angle]);

  return (
    <div aria-hidden="true" className="relative mx-auto" style={{ width: SIZE, height: H + 4 }}>
      <svg width={SIZE} height={H + 4} viewBox={`0 0 ${SIZE} ${H + 4}`}>
        <path
          d={arc(-90, 90)}
          stroke="var(--color-surface-2, #e4eae0)"
          strokeWidth={SW}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={arc(-90, -32)}
          stroke="#22c55e"
          strokeWidth={SW}
          fill="none"
          strokeLinecap="round"
        />
        <path d={arc(-26, 26)} stroke="#f59e0b" strokeWidth={SW} fill="none" />
        <path d={arc(32, 90)} stroke="#ef4444" strokeWidth={SW} fill="none" strokeLinecap="round" />
      </svg>
      {/* aguja */}
      <div
        className="nl-gauge-needle absolute bottom-4 left-1/2 -ml-[2px] w-1 origin-bottom rounded"
        style={{
          height: RAD - 12,
          transform: `rotate(${angle}deg)`,
          background: `linear-gradient(${meta.ring}, ${meta.fg})`,
          boxShadow: `0 0 10px ${meta.ring}66`,
        }}
      />
      {/* pivote */}
      <div
        className="absolute bottom-4 left-1/2 -mb-[9px] -ml-[9px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18)]"
        style={{ border: `4px solid ${meta.ring}` }}
      />
    </div>
  );
}
