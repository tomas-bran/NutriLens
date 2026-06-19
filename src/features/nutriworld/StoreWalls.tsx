'use client';

/**
 * Paredes del supermercado: 3 muros (izquierda +X, derecha -X, fondo -Z) que
 * encierran el área de juego (BOUND≈18). Se deja abierto el lado +Z porque la
 * cámara en tercera persona mira desde ahí — un cuarto muro taparía la escena.
 * Cada muro tiene zócalo oscuro + franja superior para dar sensación de local
 * real sin costo de geometría.
 */
const W = 19; // distancia del muro al centro (apenas fuera de BOUND)
const SPAN = W * 2; // largo del muro
const H = 4.5; // altura
const T = 0.4; // espesor

function Wall({
  position,
  args,
}: {
  position: [number, number, number];
  args: [number, number, number];
}) {
  const [w, h, d] = args;
  return (
    <group position={position}>
      {/* Muro */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={args} />
        <meshStandardMaterial color="#f4f6f8" roughness={0.95} />
      </mesh>
      {/* Zócalo */}
      <mesh position={[0, -h / 2 + 0.25, 0]}>
        <boxGeometry args={[w + 0.02, 0.5, d + 0.02]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
      </mesh>
      {/* Franja superior (acento) */}
      <mesh position={[0, h / 2 - 0.35, 0]}>
        <boxGeometry args={[w + 0.02, 0.18, d + 0.02]} />
        <meshStandardMaterial color="#16a34a" roughness={0.7} emissiveIntensity={0} />
      </mesh>
    </group>
  );
}

export function StoreWalls() {
  return (
    <group>
      {/* Izquierda (+X) */}
      <Wall position={[W, H / 2, 0]} args={[T, H, SPAN]} />
      {/* Derecha (-X) */}
      <Wall position={[-W, H / 2, 0]} args={[T, H, SPAN]} />
      {/* Fondo (-Z) */}
      <Wall position={[0, H / 2, -W]} args={[SPAN, H, T]} />
    </group>
  );
}
