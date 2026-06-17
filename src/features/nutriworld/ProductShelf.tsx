'use client';

/**
 * Una góndola: panel de fondo + base + cartel de zona (Billboard) + los
 * productos de esa zona. Geometría simple (cajas/planos), sin modelos pesados.
 */
import { Billboard, Text } from '@react-three/drei';
import { PRODUCTS } from './data/products';
import type { Zone } from './data/zones';
import { ProductItem } from './ProductItem';

export function ProductShelf({ zone }: { zone: Zone }) {
  const [x, , z] = zone.position;
  const items = PRODUCTS.filter((p) => p.zone === zone.id);

  return (
    <group>
      {/* Panel de fondo detrás de los productos (mirando al pasillo, +z). */}
      <mesh position={[x, 1.2, z - 0.8]} castShadow receiveShadow>
        <boxGeometry args={[5.2, 2.4, 0.25]} />
        <meshStandardMaterial color={zone.color} roughness={0.7} />
      </mesh>

      {/* Base / estante donde apoyan las cajas. */}
      <mesh position={[x, 0.25, z]} receiveShadow>
        <boxGeometry args={[5.2, 0.5, 1.8]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.8} />
      </mesh>

      {/* Cartel de zona, siempre de cara a la cámara. */}
      <Billboard position={[x, 3, z - 0.8]}>
        <mesh>
          <planeGeometry args={[3.6, 0.9]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <Text
          fontSize={0.5}
          color={zone.color}
          anchorX="center"
          anchorY="middle"
          position={[0, 0, 0.02]}
        >
          {zone.label}
        </Text>
      </Billboard>

      {items.map((product, i) => (
        <ProductItem key={product.id} product={product} index={i} />
      ))}
    </group>
  );
}
