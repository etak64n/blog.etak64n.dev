/**
 * Guard for every `/api/admin/*` Pages Function.
 *
 * The admin UI (`/admin/`) is the only client, so requests must be same-origin and carry the
 * shared `ADMIN_KEY` as a bearer token. The key is a Pages secret (see deploy.yml); the editor
 * enters it once in the CMS, which keeps it in localStorage.
 */
interface Env {
  ADMIN_KEY?: string;
}

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

/** Compare two strings without leaking their length or content through timing. */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const bytesA = new Uint8Array(hashA);
  const bytesB = new Uint8Array(hashB);
  let diff = 0;

  for (let i = 0; i < bytesA.length; i += 1) diff |= bytesA[i] ^ bytesB[i];

  return diff === 0;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  if (!env.ADMIN_KEY) {
    return json({ error: 'ADMIN_KEY is not configured on the server' }, 503);
  }

  // Same-origin only. Modern browsers send Sec-Fetch-Site; fall back to Origin for the rest.
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  const origin = request.headers.get('Origin');
  const self = new URL(request.url).origin;
  const crossOrigin = fetchSite ? fetchSite !== 'same-origin' : origin !== null && origin !== self;

  if (crossOrigin) {
    return json({ error: 'cross-origin requests are not allowed' }, 403);
  }

  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

  if (!token || !(await timingSafeEqual(token, env.ADMIN_KEY))) {
    return json({ error: 'unauthorized' }, 401);
  }

  return next();
};
