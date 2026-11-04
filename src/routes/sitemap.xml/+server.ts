import { readMeta } from '#lib/server/boards.ts';
import { SITEMAPS } from '#lib/server/sitemap.ts';

export const GET = async ({ url }) => {
  const meta = await readMeta();
  const lastmod = meta ? `<lastmod>${new Date(meta.at).toISOString()}</lastmod>` : '';
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAPS.map((name) => `  <sitemap><loc>${url.origin}/sitemaps/${name}.xml</loc>${lastmod}</sitemap>`).join('\n')}
</sitemapindex>`;
  return new Response(body, { headers: { 'content-type': 'application/xml' } });
};
