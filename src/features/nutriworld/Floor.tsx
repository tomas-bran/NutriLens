'use client';

/**
 * Piso del supermercado: baldosas pulidas generadas por código (CanvasTexture),
 * sin assets externos. Dibuja un bloque de baldosas con junta + leve variación
 * por baldosa y lo repite sobre el plano; material poco rugoso para dar brillo
 * de local real bajo las luces. Corre client-side (la escena es ssr:false).
 */
import { useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

const FLOOR_SIZE = 46;
const TILE_REPEAT = 15; // ~3 unidades por bloque de 2x2 baldosas

function makeTileTexture(): CanvasTexture {
  const px = 256;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d')!;

  // Junta (grout) de fondo.
  ctx.fillStyle = '#cbd4cb';
  ctx.fillRect(0, 0, px, px);

  // 2x2 baldosas con leve variación de tono + un degradé diagonal sutil.
  const tiles = [
    { x: 0, y: 0, c: '#eef2ee' },
    { x: 1, y: 0, c: '#e9eee9' },
    { x: 0, y: 1, c: '#eaefea' },
    { x: 1, y: 1, c: '#f1f4f1' },
  ];
  const grout = 4;
  const size = px / 2;
  for (const t of tiles) {
    const x0 = t.x * size + grout / 2;
    const y0 = t.y * size + grout / 2;
    const w = size - grout;
    const grad = ctx.createLinearGradient(x0, y0, x0 + w, y0 + w);
    grad.addColorStop(0, t.c);
    grad.addColorStop(1, '#dfe6df');
    ctx.fillStyle = grad;
    ctx.fillRect(x0, y0, w, w);
    // Brillo tenue en la esquina (reflejo de luz cenital).
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(x0, y0, w * 0.45, w * 0.45);
  }

  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(TILE_REPEAT, TILE_REPEAT);
  tex.anisotropy = 8;
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export function Floor() {
  const tex = useMemo(() => makeTileTexture(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
      <meshStandardMaterial map={tex} roughness={0.38} metalness={0.08} />
    </mesh>
  );
}
