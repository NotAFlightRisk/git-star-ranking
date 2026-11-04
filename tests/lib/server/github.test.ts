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

  it('moves to a uint64 after it instead of wrapping round to a small id', () => {
    expect(decode(nodeId(0, 2 ** 32))).toEqual([0x92, 0, 0xcf, 0, 0, 0, 1, 0, 0, 0, 0]);
    expect(nodeId(0, 2 ** 32 + 1)).not.toBe(nodeId(0, 1));
  });
});

describe('short', () => {
  it('flattens whitespace and trims long descriptions', () => {
    expect(short('  a\n\tb  ')).toBe('a b');
    expect(short('x'.repeat(300))).toHaveLength(200);
    expect(short('   ')).toBeNull();
    expect(short(null)).toBeNull();
  });
});
