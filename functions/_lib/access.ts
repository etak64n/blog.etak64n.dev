/**
 * Checks the token that Cloudflare Access adds to each request it lets through, in the header
 * `Cf-Access-Jwt-Assertion`: a JWT signed with RS256 by the team's keys.
 * https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
 *
 * Requests can reach the Functions without passing Access, through the deployments' own pages.dev
 * hostnames, so the API trusts only a valid token: one signed by the team, issued for the editor's
 * application (`aud`), not expired, and for the editor's email address.
 */
import type { Config } from './config.ts';
import { isPassingStatus, retry } from './retry.ts';

interface Jwk {
  kid?: string;
  kty?: string;
  n?: string;
  e?: string;
}

interface KeyCache {
  teamDomain: string;
  keys: Map<string, CryptoKey>;
  fetchedAt: number;
}

/** Keys are used for an hour, and fetched again sooner (at most once a minute) for an unknown key ID. */
const KEYS_MAX_AGE = 60 * 60 * 1000;
const KEYS_MIN_AGE = 60 * 1000;

let cache: KeyCache | undefined;

async function signingKeys(teamDomain: string, unknownKey: boolean): Promise<Map<string, CryptoKey>> {
  if (cache?.teamDomain === teamDomain) {
    const age = Date.now() - cache.fetchedAt;
    if (age < (unknownKey ? KEYS_MIN_AGE : KEYS_MAX_AGE)) return cache.keys;
  }
  // A lost connection or an answer of 429 or 5xx asks again, 0.2 and 0.4 seconds later.
  const response = await retry(
    async () => {
      const answer = await fetch(`${teamDomain}/cdn-cgi/access/certs`);
      if (isPassingStatus(answer.status)) throw new KeysUnavailable(answer.status);
      return answer;
    },
    { attempts: 3, firstDelayMs: 200, retryable: (error) => error instanceof TypeError || error instanceof KeysUnavailable },
  ).catch((error: unknown) => {
    if (error instanceof KeysUnavailable) throw new Error(`Cloudflare Access の公開鍵を取得できません（HTTP ${error.status}）`);
    throw error;
  });
  if (!response.ok) {
    throw new Error(`Cloudflare Access の公開鍵を取得できません（HTTP ${response.status}）`);
  }
  const { keys = [] } = (await response.json()) as { keys?: Jwk[] };
  const map = new Map<string, CryptoKey>();
  for (const jwk of keys) {
    if (jwk.kty !== 'RSA' || !jwk.kid || !jwk.n || !jwk.e) continue;
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    map.set(jwk.kid, key);
  }
  cache = { teamDomain, keys: map, fetchedAt: Date.now() };
  return map;
}

/** Bytes of a base64url string (JWT parts); throws on invalid characters. */
function base64UrlBytes(text: string) {
  const base64 = text.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function jsonPart(part: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(base64UrlBytes(part)));
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

/** Whether `token` is a valid Access token of the editor's application, for the editor's address. */
export async function isEditorToken(token: string, config: Config): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = jsonPart(encodedHeader);
  const payload = jsonPart(encodedPayload);
  if (!header || !payload || header.alg !== 'RS256' || typeof header.kid !== 'string') return false;

  let key = (await signingKeys(config.accessTeamDomain, false)).get(header.kid);
  // A key ID not seen yet: Access may have rotated its keys.
  key ??= (await signingKeys(config.accessTeamDomain, true)).get(header.kid);
  if (!key) return false;

  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = base64UrlBytes(encodedSignature);
  } catch {
    return false;
  }
  const signed = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signed))) return false;

  const now = Date.now() / 1000;
  const audiences: unknown[] = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined;
  return (
    audiences.includes(config.accessAud) &&
    payload.iss === config.accessTeamDomain &&
    typeof payload.exp === 'number' &&
    payload.exp > now &&
    (typeof payload.nbf !== 'number' || payload.nbf <= now + 60) &&
    email === config.editorEmail.toLowerCase()
  );
}

/** An answer of Access that may pass, such as 503, while the keys load. */
class KeysUnavailable extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}
