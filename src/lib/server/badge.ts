import { json } from '@sveltejs/kit';
import { number } from '../format.ts';
import { standing } from './boards.ts';
import { findOwner, findRepo } from './db.ts';

const LABEL = 'git rank';

// near enough for Verdana at 11px, which is what every flat badge uses
const width = (text: string) => Math.round(text.length * 6.6) + 12;

/** An owner's rank on its board, if it has one */
export async function ownerRank(login: string) {
  const owner = await findOwner(login);
  const board = owner?.kind ? 'organizations' : 'users';
  return owner ? (await standing(board, owner.stars))?.rank : undefined;
}

/** A repo's rank among every repo, if it has one */
export async function repoRank(login: string, name: string) {
  const owner = await findOwner(login);
  const repo = owner && (await findRepo(owner.id, name));
  return repo ? (await standing('repositories', repo.stars))?.rank : undefined;
}

/** Our own flat badge, in the same shape as everyone else's */
export function badge(rank?: number) {
  const value = rank ? `#${number(rank)}` : 'unranked';
  const [left, right] = [width(LABEL), width(value)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${left + right}" height="20" role="img" aria-label="${LABEL}: ${value}">
  <title>${LABEL}: ${value}</title>
  <clipPath id="ends"><rect width="${left + right}" height="20" rx="3"/></clipPath>
  <g clip-path="url(#ends)">
    <rect width="${left}" height="20" fill="#555"/>
    <rect x="${left}" width="${right}" height="20" fill="${rank ? '#0b5cc4' : '#6e7781'}"/>
  </g>
  <g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
    <text x="${left / 2}" y="14">${LABEL}</text>
    <text x="${left + right / 2}" y="14">${value}</text>
  </g>
</svg>`;
  return new Response(svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8' } });
}

/** The shape shields.io's endpoint badge reads, as the original served it */
export const shields = (rank?: number) =>
  json({
    schemaVersion: 1,
    label: LABEL,
    message: rank ? String(rank) : 'unranked',
    color: rank ? 'brightgreen' : 'lightgrey',
    cacheSeconds: 3600
  });
