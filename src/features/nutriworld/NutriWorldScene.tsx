'use client';

/**
 * La escena 3D: Canvas + luces + piso + góndolas + jugador + NPC. La cámara
 * la maneja el <Player> (tercera persona), por eso no hay OrbitControls. El
 * <Suspense> es para drei <Text> (carga la fuente async).
 */
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ZONE_LIST } from './data/zones';
import { NutriLensNPC } from './NutriLensNPC';
import { Player } from './Player';
import { ProductShelf } from './ProductShelf';

export function NutriWorldScene() {
  return (
    <Canvas camera={{ position: [0, 9, 17], fov: 50 }} dpr={[1, 2]}>
      <color attach="background" args={['#eef3ef']} />
      <fog attach="fog" args={['#eef3ef', 30, 60]} />

      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#ffffff', '#cbd5e1', 0.5]} />
      <directionalLight position={[12, 18, 8]} intensity={1.1} />

      <Suspense fallback={null}>
        {/* Piso */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[46, 46]} />
          <meshStandardMaterial color="#e2e8e3" roughness={1} />
        </mesh>

        {ZONE_LIST.map((zone) => (
          <ProductShelf key={zone.id} zone={zone} />
        ))}

        <Player />
        <NutriLensNPC />
      </Suspense>
    </Canvas>
  );
}
