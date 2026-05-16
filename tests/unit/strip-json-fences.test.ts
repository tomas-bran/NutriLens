import { describe, it, expect } from 'vitest';
import { stripJsonFences } from '@/lib/ai/strip-json-fences';

describe('stripJsonFences', () => {
  it('devuelve string vacío para input vacío', () => {
    expect(stripJsonFences('')).toBe('');
  });

  it('devuelve el JSON cuando viene puro', () => {
    const input = '{"foo":"bar"}';
    expect(stripJsonFences(input)).toBe('{"foo":"bar"}');
  });

  it('quita fences ```json al inicio y final', () => {
    const input = '```json\n{"foo":"bar"}\n```';
    expect(stripJsonFences(input)).toBe('{"foo":"bar"}');
  });

  it('quita fences sin lenguaje', () => {
    const input = '```\n{"foo":"bar"}\n```';
    expect(stripJsonFences(input)).toBe('{"foo":"bar"}');
  });

  it('extrae el JSON cuando hay texto antes y después', () => {
    const input = 'Aquí está tu respuesta: {"foo":"bar"} ¡listo!';
    expect(stripJsonFences(input)).toBe('{"foo":"bar"}');
  });

  it('preserva JSON anidado', () => {
    const input = '```json\n{"foo":{"bar":["baz"]}}\n```';
    expect(stripJsonFences(input)).toBe('{"foo":{"bar":["baz"]}}');
  });

  it('trim de espacios cuando no hay JSON', () => {
    expect(stripJsonFences('   sin json   ')).toBe('sin json');
  });

  it('es case-insensitive con el fence ```JSON', () => {
    const input = '```JSON\n{"x":1}\n```';
    expect(stripJsonFences(input)).toBe('{"x":1}');
  });
});
