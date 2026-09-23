/**
 * Title and description of a web page for link cards and references, read from the page itself
 * on request (Open Graph first, then the Twitter card, then <title> and the description meta
 * tag). Used by functions/api/admin/link-meta.ts; nothing is stored.
 */
import { fetchLimited } from './fetch-limited';

export interface LinkMeta {
  /** The page address after redirects. */
  url: string;
  title: string;
  description: string;
  siteName: string;
}

const USER_AGENT = 'Mozilla/5.0 (compatible; etak64n-blog-linkcard/1.0; +https://blog.etak64n.dev/)';
/** The head of most pages fits well within this, even with large inline scripts. */
const MAX_HTML = 512 * 1024;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 300;

/** `raw` as a URL to fetch: http(s) on a public host name, not an IP literal or a local name. */
export function fetchableUrl(raw: string): URL | null {
  let url: URL;

  try {
    url = new URL(String(raw).trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;
  if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) return null;
  // IPv4 and IPv6 literals: the lookup is for web pages, never for addresses on a network.
  if (/^\d+(\.\d+){3}$/.test(host) || host.startsWith('[')) return null;

  return url;
}

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', middot: '·', bull: '•',
  copy: '©', reg: '®', trade: '™', times: '×', yen: '¥',
};

/** Decode HTML character references once: named ones from a short list, and all numeric ones. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, ref: string) => {
    if (ref[0] !== '#') return NAMED[ref.toLowerCase()] ?? match;

    const code = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);

    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match;
  });
}

/** One line of text of at most `max` characters. */
function clean(text: string | undefined, max: number): string {
  const value = decodeEntities(text ?? '').replace(/\s+/g, ' ').trim();
  const chars = [...value];

  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : value;
}

/** Attributes of a tag, values as written (character references are decoded later). */
function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const match of tag.matchAll(/([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }

  return result;
}

/** The character encoding of a page: the Content-Type header, else a meta tag, else UTF-8. */
export function detectCharset(bytes: Uint8Array, contentType: string): string {
  const fromHeader = /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType)?.[1];

  if (fromHeader) return fromHeader.toLowerCase();

  // Meta tags are ASCII, so a byte-for-byte reading of the start of the page is enough.
  const start = String.fromCharCode(...bytes.subarray(0, 4096));
  const fromMeta =
    /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i.exec(start)?.[1];

  return (fromMeta ?? 'utf-8').toLowerCase();
}

/** Title, description and site name found in the head of a page. */
export function parseLinkMeta(html: string): Omit<LinkMeta, 'url'> {
  const headEnd = html.search(/<\/head\s*>/i);
  const head = headEnd < 0 ? html : html.slice(0, headEnd);
  const meta: Record<string, string> = {};

  for (const match of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const key = (attrs.property ?? attrs.name ?? '').toLowerCase();

    if (key && attrs.content !== undefined && meta[key] === undefined) meta[key] = attrs.content;
  }

  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head)?.[1];
  const pick = (...values: (string | undefined)[]) => values.find((value) => value && value.trim());

  return {
    title: clean(pick(meta['og:title'], meta['twitter:title'], titleTag), MAX_TITLE),
    description: clean(pick(meta['og:description'], meta.description, meta['twitter:description']), MAX_DESCRIPTION),
    siteName: clean(meta['og:site_name'], MAX_TITLE),
  };
}

/** Fetch `url` and read its title and description, or null when the page cannot be read. */
export async function fetchLinkMeta(url: string, { timeoutMs = 6000 } = {}): Promise<LinkMeta | null> {
  const page = await fetchLimited(url, 'text/html,application/xhtml+xml', MAX_HTML, timeoutMs, USER_AGENT);

  if (!page) return null;

  let html: string;

  try {
    html = new TextDecoder(detectCharset(page.bytes, page.contentType)).decode(page.bytes);
  } catch {
    // An encoding label that this runtime does not know.
    html = new TextDecoder().decode(page.bytes);
  }

  return { url: page.url, ...parseLinkMeta(html) };
}
