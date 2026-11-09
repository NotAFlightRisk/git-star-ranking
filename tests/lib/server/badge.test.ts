import { describe, expect, it } from 'vitest';
import { badge, shields } from '../../../src/lib/server/badge.ts';

describe('badge', () => {
  it('shows the rank on blue', async () => {
    const svg = await badge(1_234).text();
    expect(svg).toContain('>#1,234</text>');
    expect(svg).toContain('#0b5cc4');
  });

  it('greys out anything without one', async () => {
    const svg = await badge().text();
    expect(svg).toContain('>unranked</text>');
    expect(svg).toContain('#6e7781');
  });
});

describe('shields', () => {
  it('hands shields.io the bare rank', async () => {
    expect(await shields(42).json()).toMatchObject({ message: '42', color: 'brightgreen' });
    expect(await shields().json()).toMatchObject({ message: 'unranked', color: 'lightgrey' });
  });
});
