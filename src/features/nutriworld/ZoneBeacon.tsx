'use client';

/**
 * Anillo pulsante en el piso, frente a la góndola objetivo, mientras el NPC
 * guía o ya llegó. Le marca al usuario adónde ir ("seguime hasta acá").
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { ZONES } from './data/zones';
import { useNutriWorld } from './store/useNutriWorldStore';

export function ZoneBeacon() {
  const ref = useRef<Group>(null);
  const targetZone = useNutriWorld((s) => s.npcTargetZone);
  const npcState = useNutriWorld((s) => s.npcState);
  const visible = targetZone != null && (npcState === 'guiding' || npcState === 'arrived');

  useFrame((three) => {
    if (!ref.current || !visible) return;
    const s = 1 + Math.sin(three.clock.elapsedTime * 3) * 0.12;
    ref.current.scale.set(s, 1, s);
  });

  if (!visible || !targetZone) return null;
  const [x, , z] = ZONES[targetZone].position;
  const color = ZONES[targetZone].color;

  return (
    <group ref={ref} position={[x, 0.04, z + 1.6]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.9, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.9, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}
