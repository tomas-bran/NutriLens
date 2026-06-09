/**
 * Tests de los helpers del branch compare (US-31).
 */
import { describe, expect, it } from 'vitest';
import type { Product as PrismaProduct } from '@prisma/client';
import {
  buildMissingProductMessage,
  findMissingComparables,
  matchProductsByName,
} from '@/lib/chat/compare-helpers';

function row(nombre: string): PrismaProduct {
  return {
    id: nombre.toLowerCase().replace(/\s+/g, '-'),
    fileHash: nombre,
    nombre,
    categoria: 'galletitas',
    ingredientes: '[]',
    alergenos: '[]',
    sellos: '[]',
    aptoVegano: false,
    aptoCeliaco: false,
    aptoSinLactosa: false,
    riesgo: 'bajo',
    confidence: 0.9,
    reglasAplicadas: '[]',
    explanation: null,
    jsonRaw: '{}',
    pipelineTrace: '[]',
    imagenPath: '/x.jpg',
    imagenMime: 'image/jpeg',
    imagenBytes: 1024,
    promptVersion: 'extract_product-v1',
    createdAt: new Date(),
  };
}

describe('matchProductsByName', () => {
  it('matchea cuando el nombre pedido es exacto al nombre guardado', () => {
    const r = matchProductsByName(['Galletitas X'], [row('Galletitas X')]);
    expect(r[0]!.matched?.nombre).toBe('Galletitas X');
  });

  it('matchea cuando el nombre pedido es substring del guardado (usuario abrevia)', () => {
    const r = matchProductsByName(['Choco Crunch'], [row('Cereales Choco Crunch 500g')]);
    expect(r[0]!.matched?.nombre).toBe('Cereales Choco Crunch 500g');
  });

  it('matchea cuando el nombre guardado es substring del pedido (usuario agrega contexto)', () => {
    const r = matchProductsByName(['Galletitas Sin TACC X Pack'], [row('Galletitas Sin TACC X')]);
    expect(r[0]!.matched?.nombre).toBe('Galletitas Sin TACC X');
  });

  it('es case-insensitive', () => {
    const r = matchProductsByName(['GALLETITAS x'], [row('Galletitas X')]);
    expect(r[0]!.matched?.nombre).toBe('Galletitas X');
  });

  it('es diacritic-insensitive (tildes opcionales)', () => {
    const r = matchProductsByName(['Yogur de limon'], [row('Yogur de Limón')]);
    expect(r[0]!.matched?.nombre).toBe('Yogur de Limón');
  });

  it('devuelve null cuando no hay match', () => {
    const r = matchProductsByName(['Producto Inexistente'], [row('Galletitas X')]);
    expect(r[0]!.matched).toBeNull();
  });

  it('preserva el orden de los nombres pedidos', () => {
    const r = matchProductsByName(
      ['Galletitas Y', 'Galletitas X'],
      [row('Galletitas X'), row('Galletitas Y')],
    );
    expect(r[0]!.requested).toBe('Galletitas Y');
    expect(r[1]!.requested).toBe('Galletitas X');
  });

  it('strings vacíos NO matchean a nada (defensiva)', () => {
    const r = matchProductsByName([''], [row('Galletitas X')]);
    expect(r[0]!.matched).toBeNull();
  });
});

describe('findMissingComparables', () => {
  it('devuelve [] cuando todos los nombres tienen match', () => {
    const r = findMissingComparables(
      ['Galletitas X', 'Galletitas Y'],
      [row('Galletitas X'), row('Galletitas Y')],
    );
    expect(r).toEqual([]);
  });

  it('devuelve los nombres sin match', () => {
    const r = findMissingComparables(['Galletitas X', 'Cereales Fantasma'], [row('Galletitas X')]);
    expect(r).toEqual(['Cereales Fantasma']);
  });

  it('puede devolver múltiples faltantes', () => {
    const r = findMissingComparables(['A', 'B', 'C'], []);
    expect(r).toEqual(['A', 'B', 'C']);
  });
});

describe('buildMissingProductMessage', () => {
  it('cero faltantes → string vacío', () => {
    expect(buildMissingProductMessage([])).toBe('');
  });

  it('un faltante → mensaje singular con CTA de analizar', () => {
    const msg = buildMissingProductMessage(['Galletitas X']);
    expect(msg).toContain('"Galletitas X"');
    expect(msg).toContain('No tengo');
    expect(msg).toContain('analizar');
  });

  it('múltiples faltantes → mensaje plural', () => {
    const msg = buildMissingProductMessage(['Galletitas X', 'Cereales Y']);
    expect(msg).toContain('"Galletitas X"');
    expect(msg).toContain('"Cereales Y"');
    expect(msg).toContain('analizar');
  });
});
