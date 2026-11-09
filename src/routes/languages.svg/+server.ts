import * as icons from 'simple-icons';
import { drawn } from '#lib/languages.ts';

// built once at deploy, then served as a plain file without waking the Worker
export const prerender = true;

const symbols = Object.values(icons)
  .filter((icon) => drawn.has(icon.slug))
  .map(({ slug, path }) => `<symbol id="${slug}" viewBox="0 0 24 24"><path d="${path}"/></symbol>`);

export const GET = () =>
  new Response(`<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>`, {
    headers: { 'content-type': 'image/svg+xml' }
  });
