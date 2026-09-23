/**
 * Favicon resolution straight from a site, without a third-party favicon service. Used by
 * functions/favicon/[host].ts on every request: nothing is stored.
 *
 * 1. Fetch https://<host>/ and read the icon links in its <head> (`rel` icon, shortcut icon,
 *    apple-touch-icon), honouring <base href>.
 * 2. Try them best first (raster icons of about 32 to 64 px before large touch icons), then
 *    /favicon.ico.
 * 3. Accept only PNG, ICO, GIF, JPEG or WebP recognised by their first bytes. SVG is refused:
 *    served from the blog's origin, a hostile SVG could run script when opened directly.
 */
export interface Favicon {
  bytes: Uint8Array;
  type: string;
  ext: string;
  /** Where the icon came from, for logs. */
  source: string;
}

const USER_AGENT = 'Mozilla/5.0 (compatible; etak64n-blog-favicon/1.0; +https://blog.etak64n.dev/)';
const MAX_HTML = 256 * 1024;
const MAX_ICON = 200 * 1024;
/** Icons are shown at 16 to 18 CSS px; about 48 px stays crisp on 2x and 3x screens. */
const TARGET_SIZE = 48;
const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/;

/** `www.Example.com`, `example.com:8080`, `例え.jp` → a lowercase ASCII hostname, or null. */
export function normalizeHost(raw: string): string | null {
  try {
    const decoded = decodeURIComponent(String(raw)).trim().replace(/\.ico$/i, '');

    if (!decoded || /[/\\?#@\s]/.test(decoded)) return null;

    const { hostname } = new URL(`https://${decoded}`);

    return HOSTNAME.test(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

/** The image type of `bytes` from its signature, or null if it is not a supported raster image. */
export function sniffImage(bytes: Uint8Array): { type: string; ext: string } | null {
  const b = bytes;
  const ascii = (start: number, end: number) => String.fromCharCode(...b.subarray(start, end));

  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 4) === 'PNG') return { type: 'image/png', ext: 'png' };
  if (b.length >= 6 && b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return { type: 'image/x-icon', ext: 'ico' };
  if (b.length >= 6 && ascii(0, 4) === 'GIF8') return { type: 'image/gif', ext: 'gif' };
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { type: 'image/webp', ext: 'webp' };

  return null;
}

/** GET `url` and read at most `limit` bytes. `complete` is false when the body was longer. */
async function fetchLimited(
  url: string,
  accept: string,
  limit: number,
  timeoutMs: number,
): Promise<{ url: string; bytes: Uint8Array; complete: boolean } | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: accept },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok || !response.body) return null;

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    let complete = true;

    for (;;) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      size += value.byteLength;

      if (size > limit) {
        complete = false;
        await reader.cancel();
        break;
      }
    }

    const bytes = new Uint8Array(Math.min(size, limit));
    let offset = 0;

    for (const chunk of chunks) {
      const part = chunk.subarray(0, Math.min(chunk.byteLength, bytes.byteLength - offset));

      bytes.set(part, offset);
      offset += part.byteLength;

      if (offset >= bytes.byteLength) break;
    }

    return { url: response.url || url, bytes, complete };
  } catch {
    return null;
  }
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const match of tag.matchAll(/([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    result[match[1].toLowerCase()] = (match[2] ?? match[3] ?? match[4] ?? '').replace(/&amp;/g, '&').trim();
  }

  return result;
}

/** Icon URLs declared by a page, best first. */
export function iconCandidates(page: string, pageUrl: string): string[] {
  // Icon links belong in <head>; scanning only that part keeps the CPU time low.
  const headEnd = page.search(/<\/head\s*>/i);
  const html = headEnd < 0 ? page : page.slice(0, headEnd);
  let base = pageUrl;
  const baseTag = /<base\b[^>]*>/i.exec(html);

  if (baseTag) {
    try {
      base = new URL(attributes(baseTag[0]).href ?? '', pageUrl).href;
    } catch {
      // Keep the page URL.
    }
  }

  const found: { href: string; score: number }[] = [];

  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(tag);
    const rel = (attrs.rel ?? '').toLowerCase().split(/\s+/);
    const isIcon = rel.includes('icon');
    const isTouchIcon = rel.some((r) => r.startsWith('apple-touch-icon'));

    if ((!isIcon && !isTouchIcon) || !attrs.href) continue;
    if (/svg/i.test(attrs.type ?? '') || /\.svg(?:[?#]|$)/i.test(attrs.href)) continue;

    let href: string;

    try {
      href = new URL(attrs.href, base).href;
    } catch {
      continue;
    }

    if (!/^(?:https?|data):/.test(href)) continue;

    const sizes = (attrs.sizes ?? '')
      .split(/\s+/)
      .map((s) => /^(\d+)x\d+$/i.exec(s))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => Number(m[1]));
    const size = sizes.length ? Math.max(...sizes) : 0;
    const sizeScore = size ? -Math.abs(size - TARGET_SIZE) - (size < 32 ? 40 : 0) : -20;

    found.push({ href, score: (isIcon ? 100 : 0) + sizeScore });
  }

  return [...new Set(found.sort((a, b) => b.score - a.score).map((c) => c.href))];
}

function decodeDataUrl(url: string): Uint8Array | null {
  const match = /^data:([^,]*?)(;base64)?,(.*)$/is.exec(url);

  if (!match) return null;

  try {
    if (!match[2]) return new TextEncoder().encode(decodeURIComponent(match[3]));

    const binary = atob(match[3].replace(/\s+/g, ''));

    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** The favicon of `host`, fetched from the site itself, or null if none is usable. */
export async function resolveFavicon(
  host: string,
  { timeoutMs = 5000, maxCandidates = 4 } = {},
): Promise<Favicon | null> {
  const normalized = normalizeHost(host);

  if (!normalized) return null;

  const home = `https://${normalized}/`;
  const page = await fetchLimited(home, 'text/html,application/xhtml+xml', MAX_HTML, timeoutMs);
  const pageUrl = page?.url ?? home;
  const candidates = page ? iconCandidates(new TextDecoder().decode(page.bytes), pageUrl) : [];

  for (const fallback of [new URL('/favicon.ico', pageUrl).href, new URL('/favicon.ico', home).href]) {
    if (!candidates.includes(fallback)) candidates.push(fallback);
  }

  for (const href of candidates.slice(0, maxCandidates)) {
    let bytes: Uint8Array | null = null;

    if (href.startsWith('data:')) {
      bytes = decodeDataUrl(href);
    } else {
      const icon = await fetchLimited(href, 'image/*', MAX_ICON, timeoutMs);

      bytes = icon?.complete ? icon.bytes : null;
    }

    const kind = bytes && bytes.byteLength > 0 && bytes.byteLength <= MAX_ICON ? sniffImage(bytes) : null;

    if (bytes && kind) return { bytes, ...kind, source: href.startsWith('data:') ? 'data: URL in the page' : href };
  }

  return null;
}
