/**
 * GET /favicon/<host> — the favicon of a site, served from this origin.
 *
 * Link cards and ref pills show the favicon of the page they point to. The site's
 * Content-Security-Policy (a Transform Rule on the zone) only allows images from this origin,
 * so the templates point here, and this function fetches the icon from DuckDuckGo.
 *
 * - The host is validated and normalised (punycode, no port). Only DuckDuckGo is ever fetched.
 * - The body must be a raster image recognised by its first bytes (PNG, ICO, GIF, JPEG, WebP) of
 *   at most 100 kB, and is served with the matching type (DuckDuckGo sends e.g. `image/ico`).
 *   Anything else, including a 404 or an empty body, becomes a neutral globe icon, so pages never
 *   show a broken image.
 * - Browsers keep icons for a week; the colo's Cloudflare cache avoids refetching them.
 * - Requests from other sites (Sec-Fetch-Site: cross-site / same-site) are refused, so the
 *   endpoint cannot be hotlinked as a general favicon service.
 */
const UPSTREAM = 'https://icons.duckduckgo.com/ip3/';
const MAX_BYTES = 100_000;
const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const GLOBE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="none" ' +
  'stroke="#64748b" stroke-width="1.8"><circle cx="12" cy="12" r="9"/>' +
  '<path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';

const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/;

/** `www.Example.com`, `example.com:8080`, `例え.jp` → a lowercase ASCII hostname, or null. */
export function normalizeHost(raw: string): string | null {
  try {
    const decoded = decodeURIComponent(raw).trim().replace(/\.ico$/i, '');

    if (!decoded || /[/\\?#@\s]/.test(decoded)) return null;

    const { hostname } = new URL(`https://${decoded}`);

    return HOSTNAME.test(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

/** The image type of `bytes` from its signature, or null if it is not a supported raster image. */
export function sniffImageType(bytes: Uint8Array): string | null {
  const b = bytes;

  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 6 && b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) return 'image/x-icon';
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 12 && String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP') {
    return 'image/webp';
  }

  return null;
}

const imageResponse = (body: BodyInit, type: string, maxAge: number): Response =>
  new Response(body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': `public, max-age=${maxAge}`,
      'X-Content-Type-Options': 'nosniff',
    },
  });

const globe = (maxAge: number): Response => imageResponse(GLOBE_SVG, 'image/svg+xml', maxAge);

async function fetchIcon(host: string): Promise<Response> {
  try {
    const upstream = await fetch(`${UPSTREAM}${host}.ico`, { cf: { cacheTtl: WEEK, cacheEverything: true } });

    if (!upstream.ok || Number(upstream.headers.get('Content-Length') ?? 0) > MAX_BYTES) {
      return globe(DAY);
    }

    const bytes = new Uint8Array(await upstream.arrayBuffer());
    const type = bytes.length <= MAX_BYTES ? sniffImageType(bytes) : null;

    return type ? imageResponse(bytes, type, WEEK) : globe(DAY);
  } catch {
    return globe(HOUR);
  }
}

export const onRequestGet: PagesFunction<Record<string, never>, 'host'> = async ({ request, params, waitUntil }) => {
  const fetchSite = request.headers.get('Sec-Fetch-Site');

  if (fetchSite === 'cross-site' || fetchSite === 'same-site') {
    return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  const host = normalizeHost(String(params.host ?? ''));

  if (!host) return globe(DAY);

  const cache = caches.default;
  const key = new Request(new URL(`/favicon/${host}`, request.url).toString());
  const cached = await cache.match(key);

  if (cached) return cached;

  const response = await fetchIcon(host);

  waitUntil(cache.put(key, response.clone()));

  return response;
};
