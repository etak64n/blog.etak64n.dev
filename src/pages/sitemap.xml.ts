import type { APIRoute } from 'astro';
import { getPosts, postPath, tagCounts, tagPath } from '../lib/posts.ts';
import { SITE } from '../site.ts';

interface Entry {
  path: string;
  lastModified?: Date;
}

const escapeXml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Sitemap of the listing pages and every post; `lastmod` is the post's `updated` or `date`. */
export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const lastModified = (post: (typeof posts)[number]) => post.data.updated ?? post.data.date;
  const newest = posts.map(lastModified).sort((a, b) => b.getTime() - a.getTime())[0];

  const entries: Entry[] = [
    { path: '/', lastModified: newest },
    { path: '/posts/', lastModified: newest },
    { path: '/tags/' },
    ...tagCounts(posts).map(({ tag }) => ({ path: tagPath(tag) })),
    ...posts.map((post) => ({ path: postPath(post.id), lastModified: lastModified(post) })),
  ];

  const urls = entries.map(({ path, lastModified: date }) => {
    const loc = `<loc>${escapeXml(new URL(path, SITE.url).href)}</loc>`;
    return date ? `  <url>${loc}<lastmod>${date.toISOString()}</lastmod></url>` : `  <url>${loc}</url>`;
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
