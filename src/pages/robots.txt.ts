import type { APIRoute } from 'astro';
import { SITE } from '../site.ts';

export const GET: APIRoute = () =>
  new Response(['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('/sitemap.xml', SITE.url).href}`, ''].join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
