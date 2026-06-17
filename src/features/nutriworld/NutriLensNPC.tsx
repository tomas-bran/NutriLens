'use client';

/**
 * NutriLens, el NPC guía. Camina en línea recta hacia la góndola objetivo
 * cuando el estado es `guiding` y, al llegar, dispara `npcArrived()`. El cuerpo
 * "flota" distinto según el estado (idle/thinking/guiding/arrived) y un orbe
 * sobre la cabeza indica el estado con color.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html, Text } from '@react-three/drei';
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
  const message = useNutriWorld((s) => s.assistantMessage);
  const target = useMemo(() => new Vector3(), []);
  const dir = useMemo(() => new Vector3(), []);
  // Animación de llegada (one-shot): detecta el flanco a 'arrived'.
  const prevState = useRef<NpcState>(npcState);
  const arriveStart = useRef<number | null>(null);

  useFrame((three, delta) => {
    const g = root.current;
    if (!g) return;
    const t = three.clock.elapsedTime;

    // Flanco de subida a 'arrived' → arranca el festejo.
    if (npcState === 'arrived' && prevState.current !== 'arrived') {
      arriveStart.current = t;
    }
    prevState.current = npcState;

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

    // One-shot de llegada: salto + giro completo.
    let hop = 0;
    let spin = 0;
    if (arriveStart.current !== null) {
      const e = t - arriveStart.current;
      const DUR = 1.2;
      if (e < DUR) {
        const k = e / DUR; // 0..1
        hop = Math.sin(k * Math.PI) * 0.55;
        spin = k * Math.PI * 2; // un giro completo
      } else {
        arriveStart.current = null;
      }
    }

    // Flotación distinta por estado (+ hop de llegada).
    if (body.current) {
      const amp = npcState === 'guiding' ? 0.18 : npcState === 'thinking' ? 0.13 : 0.06;
      const freq = npcState === 'guiding' ? 9 : npcState === 'thinking' ? 6 : 2.5;
      body.current.position.y = 0.35 + Math.sin(t * freq) * amp + hop;
      body.current.rotation.y = spin;
    }
    if (orb.current) {
      const s = 1 + Math.sin(t * 5) * 0.15;
      orb.current.scale.setScalar(s);
    }
  });

  const stateLabel = STATE_LABEL[npcState];
  const accent = STATE_COLOR[npcState];

  return (
    <group ref={root} position={[2.5, 0, 4]}>
      <group ref={body}>
        {/* Núcleo / torso metálico (flota, sin piernas) */}
        <mesh castShadow position={[0, 1.0, 0]}>
          <capsuleGeometry args={[0.4, 0.5, 12, 24]} />
          <meshStandardMaterial color="#dbe4ec" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Panel de pecho luminoso */}
        <mesh position={[0, 1.02, 0.37]}>
          <boxGeometry args={[0.3, 0.34, 0.05]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
        </mesh>
        {/* Cabeza-pantalla metálica */}
        <mesh castShadow position={[0, 1.82, 0]}>
          <boxGeometry args={[0.62, 0.5, 0.5]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Visor (pantalla oscura) */}
        <mesh position={[0, 1.84, 0.27]}>
          <boxGeometry args={[0.5, 0.3, 0.04]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} />
        </mesh>
        {/* Ojos digitales emisivos */}
        <mesh position={[-0.12, 1.86, 0.3]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={1.4} />
        </mesh>
        <mesh position={[0.12, 1.86, 0.3]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={1.4} />
        </mesh>
        {/* Brazos flotantes (esferas a los lados) */}
        <mesh position={[-0.52, 1.0, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0.52, 1.0, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Base anti-grav (cono + anillo luminoso) en vez de piernas */}
        <mesh position={[0, 0.58, 0]}>
          <coneGeometry args={[0.34, 0.42, 18]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.04, 8, 24]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} />
        </mesh>
        {/* Antena */}
        <mesh position={[0, 2.18, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.24, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Orbe de estado en la punta de la antena */}
        <mesh ref={orb} position={[0, 2.38, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} />
        </mesh>
      </group>

      <Billboard position={[0, 2.95, 0]}>
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

      {/* Burbuja de diálogo (DOM 3D, sigue al NPC). Solo cuando "habla". */}
      {message && npcState !== 'idle' && (
        <Html position={[0, 3.5, 0]} center distanceFactor={11} zIndexRange={[20, 0]}>
          <div className="pointer-events-none w-56 -translate-y-2 rounded-2xl rounded-bl-sm border border-[var(--color-border)] bg-white/95 px-3 py-2 text-center text-[13px] leading-snug text-[var(--color-text)] shadow-xl">
            {message.length > 110 ? `${message.slice(0, 110)}…` : message}
          </div>
        </Html>
      )}
    </group>
  );
}
