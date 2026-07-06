import { posts } from '$lib/content/posts';
import { siteUrl, siteTitle } from '$lib/config';

export const prerender = true;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const GET = async () => {
  const items = posts
    .slice(0, 30)
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${siteUrl}/articles/${p.slug}/</link>
      <guid>${siteUrl}/articles/${p.slug}/</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      ${p.description ? `<description>${esc(p.description)}</description>` : ''}
    </item>`
    )
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(siteTitle)}</title>
    <link>${siteUrl}/</link>
    <description>${esc(siteTitle)}</description>
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' }
  });
};
