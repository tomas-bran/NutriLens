import { describe, it, expect } from 'vitest';
import { stripJsonFences } from '@/lib/ai/strip-json-fences';

describe('stripJsonFences', () => {
  it('returns empty string for empty input', () => {
    expect(stripJsonFences('')).toBe('');
  });

  it('returns the JSON unchanged when it is already clean', () => {
    const input = '{"foo":"bar"}';
    expect(stripJsonFences(input)).toBe('{"foo":"bar"}');
  });

  it('strips ```json fences', () => {
    const input = '```json\n{"foo":"bar"}\n```';
    expect(stripJsonFences(input)).toBe('{"foo":"bar"}');
  });

  it('strips language-less fences', () => {
    const input = '```\n{"foo":"bar"}\n```';
    expect(stripJsonFences(input)).toBe('{"foo":"bar"}');
  });

  it('extracts the JSON when surrounded by prose', () => {
    const input = 'Aquí está tu respuesta: {"foo":"bar"} ¡listo!';
    expect(stripJsonFences(input)).toBe('{"foo":"bar"}');
  });

  it('preserves nested JSON', () => {
    const input = '```json\n{"foo":{"bar":["baz"]}}\n```';
    expect(stripJsonFences(input)).toBe('{"foo":{"bar":["baz"]}}');
  });

  it('trims whitespace when there is no JSON at all', () => {
    expect(stripJsonFences('   no json   ')).toBe('no json');
  });

  it('is case-insensitive with the ```JSON fence', () => {
    const input = '```JSON\n{"x":1}\n```';
    expect(stripJsonFences(input)).toBe('{"x":1}');
  });
});
