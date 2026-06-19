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
import { PRODUCTS } from './data/products';
import {
  getNearProductId,
  selectProduct,
  setNearProduct,
  setPlayerPos,
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
  // Acumulador para throttlear el push de posición al store (minimapa).
  const posAccum = useRef(0);
  // Ciclo de caminata: fase + pivotes de brazos/piernas.
  const walkPhase = useRef(0);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);

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

    // Ciclo de caminata: brazos y piernas oscilan (fase opuesta) al moverse y
    // vuelven al reposo suavemente al frenar.
    const moving = len > 0;
    if (moving) walkPhase.current += delta * (k.has('run') ? 13 : 8.5);
    const amp = moving ? (k.has('run') ? 0.8 : 0.55) : 0;
    const s = Math.sin(walkPhase.current) * amp;
    const ease = Math.min(1, delta * 12);
    if (leftArm.current) leftArm.current.rotation.x += (s - leftArm.current.rotation.x) * ease;
    if (rightArm.current) rightArm.current.rotation.x += (-s - rightArm.current.rotation.x) * ease;
    if (leftLeg.current) leftLeg.current.rotation.x += (-s - leftLeg.current.rotation.x) * ease;
    if (rightLeg.current) rightLeg.current.rotation.x += (s - rightLeg.current.rotation.x) * ease;

    // Cámara en tercera persona: offset fijo detrás/arriba, lerp frame-rate-safe.
    camTarget.set(g.position.x, g.position.y + 7, g.position.z + 11);
    camera.position.lerp(camTarget, 1 - Math.pow(0.0015, delta));
    camera.lookAt(g.position.x, g.position.y + 1, g.position.z);

    // Producto más cercano dentro del rango → habilita "E" (cualquier producto,
    // haya o no una consulta activa).
    let nearest: string | null = null;
    let best = NEAR_RANGE;
    for (const p of PRODUCTS) {
      tmp.set(p.position[0], g.position.y, p.position[2]);
      const d = tmp.distanceTo(g.position);
      if (d < best) {
        best = d;
        nearest = p.id;
      }
    }
    setNearProduct(nearest);

    // Posición → store (throttle ~12 Hz) para el minimapa.
    posAccum.current += delta;
    if (posAccum.current >= 0.08) {
      posAccum.current = 0;
      setPlayerPos(g.position.x, g.position.z);
    }
  });

  return (
    <group ref={ref} position={[0, 0, 6]}>
      {/* Figura humana estilizada: piernas + torso + brazos + cabeza, mirando +Z.
          Brazos/piernas viven en grupos-pivote (hombro/cadera) que rotan en X
          para el ciclo de caminata. */}
      {/* Piernas (pantalón) — pivote en la cadera */}
      <group ref={leftLeg} position={[-0.13, 0.72, 0]}>
        <mesh castShadow position={[0, -0.36, 0]}>
          <cylinderGeometry args={[0.11, 0.09, 0.72, 12]} />
          <meshStandardMaterial color="#334155" roughness={0.75} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.13, 0.72, 0]}>
        <mesh castShadow position={[0, -0.36, 0]}>
          <cylinderGeometry args={[0.11, 0.09, 0.72, 12]} />
          <meshStandardMaterial color="#334155" roughness={0.75} />
        </mesh>
      </group>
      {/* Torso (remera) */}
      <mesh castShadow position={[0, 1.02, 0]}>
        <capsuleGeometry args={[0.26, 0.42, 8, 16]} />
        <meshStandardMaterial color="#2563eb" roughness={0.55} />
      </mesh>
      {/* Brazos — pivote en el hombro */}
      <group ref={leftArm} position={[-0.34, 1.22, 0]}>
        <mesh castShadow position={[0, -0.23, 0]}>
          <capsuleGeometry args={[0.08, 0.46, 6, 12]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.6} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.34, 1.22, 0]}>
        <mesh castShadow position={[0, -0.23, 0]}>
          <capsuleGeometry args={[0.08, 0.46, 6, 12]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.6} />
        </mesh>
      </group>
      {/* Cabeza + pelo */}
      <mesh castShadow position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshStandardMaterial color="#f1c27d" roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.71, -0.02]} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.205, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color="#3b2a1a" roughness={0.85} />
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
