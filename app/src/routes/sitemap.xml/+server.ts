import { posts, allTags } from '$lib/content/posts';
import { siteUrl } from '$lib/config';

export const prerender = true;

export const GET = async () => {
  const urls: string[] = [
    '/',
    '/articles/',
    '/tags/',
    ...posts.map((p) => `/articles/${p.slug}/`),
    ...allTags().map(({ tag }) => `/tags/${encodeURIComponent(tag)}/`)
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${siteUrl}${u}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' }
  });
};
