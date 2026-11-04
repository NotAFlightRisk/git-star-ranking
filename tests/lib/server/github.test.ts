import { describe, expect, it } from 'vitest';
import { nodeId, short } from '../../../src/lib/server/github.ts';

describe('nodeId', () => {
  // checked against GitHub's GraphQL API on 2026-11-04
  it.each([
    [0, 1, 'U_kgAB'],
    [0, 583231, 'U_kgDOAAjmPw'],
    [0, 1024025, 'U_kgDOAA-gGQ'],
    [1, 9919, 'O_kgDNJr8'],
    [1, 6154722, 'O_kgDOAF3p4g']
  ] as const)('turns kind %i id %i into %s', (kind, id, expected) => {
    expect(nodeId(kind, id)).toBe(expected);
  });
});

describe('nodeId past 32 bits', () => {
  const decode = (id: string) => [...Buffer.from(id.slice(2), 'base64url')];

  it('uses a uint32 right up to the limit', () => {
    expect(decode(nodeId(0, 2 ** 32 - 1))).toEqual([0x92, 0, 0xce, 255, 255, 255, 255]);
  });

  it('refuses ids it cannot represent exactly', () => {
    expect(() => nodeId(0, 2 ** 53)).toThrow(RangeError);
    expect(() => nodeId(0, -1)).toThrow(RangeError);
  });

  it('moves to a uint64 after it instead of wrapping round to a small id', () => {
    expect(decode(nodeId(0, 2 ** 32))).toEqual([0x92, 0, 0xcf, 0, 0, 0, 1, 0, 0, 0, 0]);
    expect(nodeId(0, 2 ** 32 + 1)).not.toBe(nodeId(0, 1));
  });
});

describe('short', () => {
  it('flattens whitespace and drops GitHub emoji shortcodes', () => {
    expect(short('  a\n\tb  ')).toBe('a b');
    expect(short(':zap: Fast :+1: things')).toBe('Fast things');
    expect(short('Runs at 10:30:45 sharp')).toBe('Runs at 10:30:45 sharp');
    expect(short('   ')).toBeNull();
    expect(short(':books:')).toBeNull();
    expect(short(null)).toBeNull();
  });

  it('cuts a long description on a whole word', () => {
    const long = 'word '.repeat(60);
    const cut = short(long)!;
    expect(cut.length).toBeLessThanOrEqual(200);
    expect(cut.endsWith('word...')).toBe(true);
  });

  it('re-cuts a row an older crawl chopped at exactly 200, mid-word', () => {
    const chopped = `${'word '.repeat(39)}with`;
    expect(chopped).toHaveLength(199);
    expect(short(`${chopped}o`)).toBe(`${'word '.repeat(39).trim()}...`);
  });

  it('still cuts a description with no spaces in it', () => {
    expect(short('x'.repeat(300))).toBe(`${'x'.repeat(197)}...`);
  });
});
