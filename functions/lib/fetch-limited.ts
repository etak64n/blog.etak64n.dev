/**
 * Reading other sites for the Pages Functions: functions/lib/favicon.ts and link-meta.ts.
 */
export interface Fetched {
  url: string;
  bytes: Uint8Array;
  complete: boolean;
  contentType: string;
}

/**
 * GET `url` and read at most `limit` bytes. `complete` is false when the body was longer, `url`
 * is the address after redirects. Any failure, including a status other than 2xx, gives null.
 */
export async function fetchLimited(
  url: string,
  accept: string,
  limit: number,
  timeoutMs: number,
  userAgent: string,
): Promise<Fetched | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': userAgent, Accept: accept },
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

    return { url: response.url || url, bytes, complete, contentType: response.headers.get('Content-Type') ?? '' };
  } catch {
    return null;
  }
}
