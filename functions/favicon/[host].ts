/**
 * GET /favicon/<host> — the favicon of a linked site, fetched from that site on each request.
 *
 * Link cards and ref pills show the favicon of the page they point to. The public pages'
 * Content-Security-Policy (a Transform Rule on the zone) only allows images from this origin,
 * so the templates point here and this function gets the icon from the linked site itself
 * (functions/lib/favicon.ts): no third-party favicon service, and nothing stored on our side.
 *
 * - The response is always an image: the site's icon (PNG, ICO, GIF, JPEG or WebP, checked by
 *   its first bytes) or, when there is none, a neutral globe. Pages never show a broken image.
 * - `X-Favicon-Source` names the URL the icon came from.
 * - Only the reader's browser keeps a copy, for a day, like any image.
 * - Requests from other sites (Sec-Fetch-Site: cross-site / same-site) are refused, so the
 *   endpoint cannot be hotlinked as a general favicon service.
 */
import { normalizeHost, resolveFavicon } from '../lib/favicon';

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

const GLOBE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="none" ' +
  'stroke="#64748b" stroke-width="1.8"><circle cx="12" cy="12" r="9"/>' +
  '<path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';

const image = (body: BodyInit, type: string, maxAge: number, source: string): Response =>
  new Response(body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': `public, max-age=${maxAge}`,
      'X-Content-Type-Options': 'nosniff',
      'X-Favicon-Source': source,
    },
  });

export const onRequestGet: PagesFunction<Record<string, never>, 'host'> = async ({ request, params }) => {
  const fetchSite = request.headers.get('Sec-Fetch-Site');

  if (fetchSite === 'cross-site' || fetchSite === 'same-site') {
    return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  const host = normalizeHost(String(params.host ?? ''));
  const icon = host ? await resolveFavicon(host) : null;

  return icon
    ? image(icon.bytes, icon.type, DAY, icon.source)
    : image(GLOBE_SVG, 'image/svg+xml', HOUR, 'default');
};
