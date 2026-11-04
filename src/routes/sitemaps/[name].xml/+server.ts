import { error } from '@sveltejs/kit';
import { paths, SITEMAPS } from '#lib/server/sitemap.ts';

export const GET = async ({ params, url }) => {
  const name = SITEMAPS.find((option) => option === params.name);
  if (!name) error(404, 'No such sitemap');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${(await paths(name)).map((path) => `  <url><loc>${url.origin}${path}</loc></url>`).join('\n')}
</urlset>`;
  return new Response(body, { headers: { 'content-type': 'application/xml' } });
};
