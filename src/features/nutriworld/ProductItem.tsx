'use client';

/**
 * Un producto del mundo: una caja simple. Si está recomendado (resaltado),
 * se pone verde emisivo, pulsa y muestra una etiqueta flotante. Click abre la
 * ficha (igual que la tecla E al estar cerca).
 */
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import type { Mesh } from 'three';
import type { NutriProduct } from './data/products';
import { selectProduct, useNutriWorld } from './store/useNutriWorldStore';

const RISK_LABEL: Record<NutriProduct['risk'], string> = {
  bajo: 'Riesgo bajo',
  medio: 'Riesgo medio',
  alto: 'Riesgo alto',
};

export function ProductItem({ product }: { product: NutriProduct }) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const highlighted = useNutriWorld((s) => s.highlightedProductIds.includes(product.id));

  useFrame((stateThree) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    // Pulso suave solo cuando está resaltado.
    const t = stateThree.clock.elapsedTime;
    const pulse = highlighted ? 1 + Math.sin(t * 4) * 0.06 : 1;
    mesh.scale.setScalar(pulse);
    if (highlighted) mesh.rotation.y += 0.01;
  });

  const apto =
    product.aptoCeliaco && product.aptoVegano
      ? 'Apto celíaco y vegano'
      : product.aptoCeliaco
        ? 'Apto celíaco'
        : product.aptoVegano
          ? 'Apto vegano'
          : product.aptoSinLactosa
            ? 'Sin lactosa'
            : '';

  return (
    <group position={product.position}>
      <mesh
        ref={meshRef}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          if (highlighted) selectProduct(product.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.8, 1.1, 0.8]} />
        <meshStandardMaterial
          color={highlighted ? '#22c55e' : hovered ? '#cbd5e1' : '#e2e8f0'}
          emissive={highlighted ? '#16a34a' : '#000000'}
          emissiveIntensity={highlighted ? 0.6 : 0}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>

      {highlighted && (
        <Billboard position={[0, 1.5, 0]}>
          <Text
            fontSize={0.26}
            color="#0f172a"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#ffffff"
          >
            {product.name}
          </Text>
          <Text
            position={[0, -0.32, 0]}
            fontSize={0.18}
            color="#16a34a"
            anchorX="center"
            anchorY="middle"
          >
            {`${RISK_LABEL[product.risk]}${apto ? ` · ${apto}` : ''}`}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
