'use client';

/**
 * NutriLens, el NPC guía. Camina en línea recta hacia la góndola objetivo
 * cuando el estado es `guiding` y, al llegar, dispara `npcArrived()`. El cuerpo
 * "flota" distinto según el estado (idle/thinking/guiding/arrived) y un orbe
 * sobre la cabeza indica el estado con color.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { Vector3, type Group, type Mesh } from 'three';
import { ZONES } from './data/zones';
import { npcArrived, useNutriWorld, type NpcState } from './store/useNutriWorldStore';

const SPEED = 3.4;
const ARRIVE_DIST = 0.5;

const STATE_COLOR: Record<NpcState, string> = {
  idle: '#94a3b8',
  thinking: '#f59e0b',
  guiding: '#16a34a',
  arrived: '#22c55e',
};
const STATE_LABEL: Record<NpcState, string> = {
  idle: '',
  thinking: 'Pensando…',
  guiding: 'Seguime',
  arrived: '¡Llegamos!',
};

export function NutriLensNPC() {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const orb = useRef<Mesh>(null);
  const npcState = useNutriWorld((s) => s.npcState);
  const targetZone = useNutriWorld((s) => s.npcTargetZone);
  const target = useMemo(() => new Vector3(), []);
  const dir = useMemo(() => new Vector3(), []);

  useFrame((three, delta) => {
    const g = root.current;
    if (!g) return;
    const t = three.clock.elapsedTime;

    // Caminar hacia la góndola objetivo.
    if (npcState === 'guiding' && targetZone) {
      const [zx, , zz] = ZONES[targetZone].position;
      target.set(zx, 0, zz + 1.8); // se planta un poco delante de la góndola
      dir.set(target.x - g.position.x, 0, target.z - g.position.z);
      const dist = dir.length();
      if (dist > ARRIVE_DIST) {
        dir.normalize();
        g.position.x += dir.x * SPEED * delta;
        g.position.z += dir.z * SPEED * delta;
        g.rotation.y = Math.atan2(dir.x, dir.z);
      } else {
        npcArrived();
      }
    }

    // Flotación distinta por estado.
    if (body.current) {
      const amp = npcState === 'guiding' ? 0.18 : npcState === 'thinking' ? 0.13 : 0.06;
      const freq = npcState === 'guiding' ? 9 : npcState === 'thinking' ? 6 : 2.5;
      body.current.position.y = Math.sin(t * freq) * amp;
    }
    if (orb.current) {
      const s = 1 + Math.sin(t * 5) * 0.15;
      orb.current.scale.setScalar(s);
    }
  });

  const stateLabel = STATE_LABEL[npcState];

  return (
    <group ref={root} position={[2.5, 0, 4]}>
      <group ref={body}>
        {/* Cuerpo */}
        <mesh castShadow position={[0, 0.85, 0]}>
          <capsuleGeometry args={[0.42, 0.9, 8, 16]} />
          <meshStandardMaterial color="#16a34a" roughness={0.35} metalness={0.1} />
        </mesh>
        {/* Cabeza */}
        <mesh castShadow position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.34, 24, 24]} />
          <meshStandardMaterial color="#22c55e" roughness={0.3} />
        </mesh>
        {/* "Lente" (ojo cámara) */}
        <mesh position={[0, 1.72, 0.3]}>
          <circleGeometry args={[0.13, 24]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Orbe de estado */}
        <mesh ref={orb} position={[0, 2.3, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color={STATE_COLOR[npcState]}
            emissive={STATE_COLOR[npcState]}
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>

      <Billboard position={[0, 2.75, 0]}>
        <Text
          fontSize={0.3}
          color="#15803d"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#ffffff"
        >
          NutriLens
        </Text>
        {stateLabel && (
          <Text
            position={[0, -0.32, 0]}
            fontSize={0.2}
            color="#475569"
            anchorX="center"
            anchorY="middle"
          >
            {stateLabel}
          </Text>
        )}
      </Billboard>
    </group>
  );
}
