'use client';

/**
 * La escena 3D: Canvas + luces + piso + góndolas + jugador + NPC. La cámara
 * la maneja el <Player> (tercera persona), por eso no hay OrbitControls. El
 * <Suspense> es para drei <Text> (carga la fuente async).
 */
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { ZONE_LIST } from './data/zones';
import { Floor } from './Floor';
import { NutriLensNPC } from './NutriLensNPC';
import { Player } from './Player';
import { ProductShelf } from './ProductShelf';
import { StoreWalls } from './StoreWalls';
import { ZoneBeacon } from './ZoneBeacon';

export function NutriWorldScene() {
  return (
    <Canvas shadows camera={{ position: [0, 9, 17], fov: 50 }} dpr={[1, 2]}>
      <color attach="background" args={['#eaf1ea']} />
      <fog attach="fog" args={['#eaf1ea', 32, 64]} />

      {/* Luz ambiente cálida de local + relleno cielo/piso. */}
      <ambientLight intensity={0.6} />
      <hemisphereLight args={['#ffffff', '#dbe7dc', 0.55]} />
      {/* Key light con sombras (góndolas/personajes proyectan sobre el piso). */}
      <directionalLight
        position={[14, 20, 10]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
      />

      <Suspense fallback={null}>
        {/* Tiras de luz cenital (fixtures de supermercado) + halos cálidos. */}
        <CeilingLights />

        {/* Piso de baldosas pulidas + contacto suave. */}
        <Floor />
        <ContactShadows position={[0, 0.02, 0]} scale={50} far={12} blur={2.6} opacity={0.3} />

        <StoreWalls />

        {ZONE_LIST.map((zone) => (
          <ProductShelf key={zone.id} zone={zone} />
        ))}

        {/* Foco tenue tintado sobre cada góndola (color de la zona). */}
        {ZONE_LIST.map((zone) => (
          <pointLight
            key={`light-${zone.id}`}
            position={[zone.position[0], 4.2, zone.position[2] + 0.4]}
            color={zone.color}
            intensity={14}
            distance={9}
            decay={2}
          />
        ))}

        <ZoneBeacon />
        <Player />
        <NutriLensNPC />
      </Suspense>
    </Canvas>
  );
}

/**
 * Iluminación cenital cálida de local. Son SOLO fuentes de luz (sin geometría
 * visible): la cámara en 3ra persona mira casi horizontal hacia -Z, así que
 * cualquier lámpara a la altura del techo cruzaba el cuadro y tapaba la escena.
 */
function CeilingLights() {
  const rows = [-12, -4, 4, 12];
  return (
    <group>
      {rows.map((z) => (
        <pointLight
          key={z}
          position={[0, 7, z]}
          color="#fff7e0"
          intensity={20}
          distance={22}
          decay={2}
        />
      ))}
    </group>
  );
}
