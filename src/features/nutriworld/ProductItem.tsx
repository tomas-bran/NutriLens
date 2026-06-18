'use client';

/**
 * Un producto del mundo. La geometría depende de la categoría para que parezca
 * mercadería real y no una caja: bebidas = cartón con tapa, snacks = bolsa,
 * cereales = caja alta, galletitas = paquete. Cada uno con su color + etiqueta.
 * Si está recomendado (resaltado) se pone verde emisivo, pulsa y muestra su
 * nombre flotante. Click (con cercanía/E) abre la ficha.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, RoundedBox, Text } from '@react-three/drei';
import type { Group } from 'three';
import type { NutriProduct, ProductCategory } from './data/products';
import { selectProduct, useNutriWorld } from './store/useNutriWorldStore';

const RISK_LABEL: Record<NutriProduct['risk'], string> = {
  bajo: 'Riesgo bajo',
  medio: 'Riesgo medio',
  alto: 'Riesgo alto',
};

interface Style {
  /** [ancho, alto, profundidad] del cuerpo. */
  body: [number, number, number];
  color: string;
  label: string;
  accent: string;
  /** Tapa (cartón de bebida). */
  cap?: string;
}

const CATEGORY_STYLE: Record<ProductCategory, Style> = {
  galletitas: { body: [0.92, 0.68, 0.5], color: '#e0a45c', label: '#fff7ed', accent: '#b45309' },
  snacks: { body: [0.84, 1.0, 0.32], color: '#f59e0b', label: '#fffbeb', accent: '#b45309' },
  bebidas: {
    body: [0.58, 1.06, 0.58],
    color: '#7dd3fc',
    label: '#ffffff',
    accent: '#0284c7',
    cap: '#0ea5e9',
  },
  cereales: { body: [0.72, 1.12, 0.46], color: '#84cc16', label: '#f7fee7', accent: '#4d7c0f' },
};

export function ProductItem({ product, index = 0 }: { product: NutriProduct; index?: number }) {
  const groupRef = useRef<Group>(null);
  const highlighted = useNutriWorld((s) => s.highlightedProductIds.includes(product.id));
  const nearById = useNutriWorld((s) => s.nearProductId === product.id);
  // Etiquetas escalonadas en altura (par/impar) para que las de productos
  // vecinos no se enciman. La cercana/hover sube al frente.
  const labelY = 1.7 + (index % 2 === 0 ? 0 : 0.7);

  const style = CATEGORY_STYLE[product.category];
  const [w, h, d] = style.body;
  // El cuerpo se apoya sobre el estante: su base queda en y local -0.5
  // (el tope del estante en coordenadas del producto, que está en y=1).
  const baseY = -0.5;
  const bodyY = baseY + h / 2;

  useFrame((stateThree) => {
    const g = groupRef.current;
    if (!g) return;
    const t = stateThree.clock.elapsedTime;
    const pulse = highlighted ? 1 + Math.sin(t * 4) * 0.06 : 1;
    g.scale.setScalar(pulse);
    if (highlighted) g.rotation.y += 0.01;
  });

  const bodyColor = highlighted ? '#22c55e' : style.color;
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
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          // Cualquier producto se puede ver, haya o no una consulta activa.
          selectProduct(product.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        {/* Cuerpo del producto (esquinas redondeadas) */}
        <RoundedBox
          args={[w, h, d]}
          radius={0.05}
          smoothness={3}
          position={[0, bodyY, 0]}
          castShadow
        >
          <meshStandardMaterial
            color={bodyColor}
            emissive={highlighted ? '#16a34a' : '#000000'}
            emissiveIntensity={highlighted ? 0.5 : 0}
            roughness={0.5}
            metalness={0.05}
          />
        </RoundedBox>

        {/* Tapa (solo bebidas / cartón) */}
        {style.cap && (
          <mesh position={[0, baseY + h + 0.06, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.14, 16]} />
            <meshStandardMaterial color={highlighted ? '#15803d' : style.cap} roughness={0.4} />
          </mesh>
        )}

        {/* Etiqueta frontal + franja de acento (parece un envase) */}
        <mesh position={[0, bodyY + 0.02, d / 2 + 0.012]}>
          <planeGeometry args={[w * 0.78, h * 0.46]} />
          <meshStandardMaterial color={style.label} roughness={0.7} />
        </mesh>
        <mesh position={[0, bodyY - h * 0.16, d / 2 + 0.014]}>
          <planeGeometry args={[w * 0.78, h * 0.1]} />
          <meshStandardMaterial color={highlighted ? '#16a34a' : style.accent} roughness={0.6} />
        </mesh>
      </group>

      {(highlighted || nearById) && (
        <Billboard position={[0, nearById ? labelY + 0.5 : labelY, 0]}>
          {/* Nombre (solo). El riesgo/aptitud va en la ficha (E). Wrap + outline
              blanco para que se lea sobre cualquier fondo sin encimarse. */}
          <Text
            fontSize={0.22}
            color="#0f172a"
            anchorX="center"
            anchorY="middle"
            maxWidth={2.2}
            textAlign="center"
            outlineWidth={0.02}
            outlineColor="#ffffff"
          >
            {product.name}
          </Text>
          {nearById && (
            <Text
              position={[0, -0.42, 0]}
              fontSize={0.16}
              color="#16a34a"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.014}
              outlineColor="#ffffff"
            >
              {`${RISK_LABEL[product.risk]}${apto ? ` · ${apto}` : ''}`}
            </Text>
          )}
        </Billboard>
      )}
    </group>
  );
}
