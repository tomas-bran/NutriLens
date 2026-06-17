'use client';

/**
 * Avatar del usuario: cápsula controlada con WASD/flechas, cámara en tercera
 * persona que lo sigue (offset fijo, suavizado), y detección de proximidad para
 * habilitar la interacción (E) con el producto resaltado más cercano.
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { Vector3, type Group } from 'three';
import { getProductById } from './data/products';
import {
  getHighlightedIds,
  getNearProductId,
  selectProduct,
  setNearProduct,
} from './store/useNutriWorldStore';
import { ZONE_LIST } from './data/zones';
import { useKeyboard } from './useKeyboard';

const WALK_SPEED = 4;
const RUN_SPEED = 7.5;
const BOUND = 18;
const NEAR_RANGE = 2.4;
// Footprint de góndola (medio ancho/profundidad) + radio del jugador: lo
// suficientemente chico para que el jugador pueda acercarse a interactuar
// (NEAR_RANGE) pero sin atravesar el estante.
const BLOCK_X = 2.65;
const BLOCK_Z = 1.55;

const clamp = (v: number) => Math.max(-BOUND, Math.min(BOUND, v));

/** ¿(x,z) cae dentro del footprint de alguna góndola? */
function hitsShelf(x: number, z: number): boolean {
  return ZONE_LIST.some(
    (zone) => Math.abs(x - zone.position[0]) < BLOCK_X && Math.abs(z - zone.position[2]) < BLOCK_Z,
  );
}

export function Player() {
  const ref = useRef<Group>(null);
  const { camera } = useThree();
  const keys = useKeyboard(() => {
    const id = getNearProductId();
    if (id) selectProduct(id);
  });
  const tmp = useMemo(() => new Vector3(), []);
  const camTarget = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const k = keys.current;

    let dx = 0;
    let dz = 0;
    if (k.has('forward')) dz -= 1;
    if (k.has('back')) dz += 1;
    if (k.has('left')) dx -= 1;
    if (k.has('right')) dx += 1;

    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
      const speed = (k.has('run') ? RUN_SPEED : WALK_SPEED) * delta;
      // Colisión por eje (permite "deslizar" a lo largo de una góndola).
      const nx = clamp(g.position.x + dx * speed);
      if (!hitsShelf(nx, g.position.z)) g.position.x = nx;
      const nz = clamp(g.position.z + dz * speed);
      if (!hitsShelf(g.position.x, nz)) g.position.z = nz;
      g.rotation.y = Math.atan2(dx, dz);
    }

    // Cámara en tercera persona: offset fijo detrás/arriba, lerp frame-rate-safe.
    camTarget.set(g.position.x, g.position.y + 7, g.position.z + 11);
    camera.position.lerp(camTarget, 1 - Math.pow(0.0015, delta));
    camera.lookAt(g.position.x, g.position.y + 1, g.position.z);

    // Producto resaltado más cercano dentro del rango → habilita "E".
    const ids = getHighlightedIds();
    let nearest: string | null = null;
    let best = NEAR_RANGE;
    for (const id of ids) {
      const p = getProductById(id);
      if (!p) continue;
      tmp.set(p.position[0], g.position.y, p.position[2]);
      const d = tmp.distanceTo(g.position);
      if (d < best) {
        best = d;
        nearest = id;
      }
    }
    setNearProduct(nearest);
  });

  return (
    <group ref={ref} position={[0, 0, 6]}>
      <mesh castShadow position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.4, 1, 8, 16]} />
        <meshStandardMaterial color="#2563eb" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.95, 0.42]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <Billboard position={[0, 2.2, 0]}>
        <Text
          fontSize={0.26}
          color="#1d4ed8"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#ffffff"
        >
          Vos
        </Text>
      </Billboard>
    </group>
  );
}
