import { standing } from '#lib/server/boards.ts';
import { findOwner } from '#lib/server/db.ts';
import { number } from '#lib/format.ts';

// near enough for Verdana at 11px, which is what every flat badge uses
const width = (text: string) => Math.round(text.length * 6.6) + 12;

export const GET = async ({ params }) => {
  const owner = await findOwner(params.login);
  const rank = owner && (await standing(owner.kind ? 'organizations' : 'users', owner.stars));
  const label = 'git rank';
  const value = rank ? `#${number(rank.rank)}` : 'unranked';
  const [left, right] = [width(label), width(value)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${left + right}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <rect width="${left}" height="20" rx="3" fill="#555"/>
  <rect x="${left}" width="${right}" height="20" rx="3" fill="${rank ? '#0b5cc4' : '#6e7781'}"/>
  <rect x="${left}" width="4" height="20" fill="${rank ? '#0b5cc4' : '#6e7781'}"/>
  <g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
    <text x="${left / 2}" y="14">${label}</text>
    <text x="${left + right / 2}" y="14">${value}</text>
  </g>
</svg>`;
  return new Response(svg, {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8' }
  });
};
