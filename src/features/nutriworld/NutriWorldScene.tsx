'use client';

/**
 * La escena 3D: Canvas + luces + piso + góndolas + jugador + NPC. La cámara
 * la maneja el <Player> (tercera persona), por eso no hay OrbitControls. El
 * <Suspense> es para drei <Text> (carga la fuente async).
 */
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Grid } from '@react-three/drei';
import { ZONE_LIST } from './data/zones';
import { NutriLensNPC } from './NutriLensNPC';
import { Player } from './Player';
import { ProductShelf } from './ProductShelf';
import { StoreWalls } from './StoreWalls';
import { ZoneBeacon } from './ZoneBeacon';

export function NutriWorldScene() {
  return (
    <Canvas camera={{ position: [0, 9, 17], fov: 50 }} dpr={[1, 2]}>
      <color attach="background" args={['#eef3ef']} />
      <fog attach="fog" args={['#eef3ef', 30, 60]} />

      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#ffffff', '#cbd5e1', 0.5]} />
      <directionalLight position={[12, 18, 8]} intensity={1.1} />

      <Suspense fallback={null}>
        {/* Piso + grilla sutil + sombras de contacto (aterrizan los objetos). */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[46, 46]} />
          <meshStandardMaterial color="#e2e8e3" roughness={1} />
        </mesh>
        <Grid
          position={[0, 0.01, 0]}
          args={[46, 46]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#cbd5e1"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#a7b3c2"
          fadeDistance={45}
          fadeStrength={1.5}
          infiniteGrid={false}
        />
        <ContactShadows position={[0, 0.02, 0]} scale={50} far={12} blur={2.4} opacity={0.35} />

        <StoreWalls />

        {ZONE_LIST.map((zone) => (
          <ProductShelf key={zone.id} zone={zone} />
        ))}

        <ZoneBeacon />
        <Player />
        <NutriLensNPC />
      </Suspense>
    </Canvas>
  );
}
