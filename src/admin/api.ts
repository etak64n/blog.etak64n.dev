/** Calls from the editor's pages to its API (functions/admin/api/). */
import type { Post, PostSummary, SaveRequest, SaveResult } from '../../functions/_lib/posts.ts';

export type { Post, PostSummary, SaveRequest, SaveResult };

export class ApiError extends Error {
  /** HTTP status; 409 means the save was refused to keep a change made on GitHub. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// A read runs again after a lost connection or an answer of 429 or 5xx, 0.5 and 1 second later.
// A save runs once: one that reached GitHub before its answer got lost must not happen twice.
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const read = (init.method ?? 'GET') === 'GET';
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await callOnce<T>(path, init);
    } catch (error) {
      const passing = error instanceof ApiError && (error.status === 0 || [429, 500, 502, 503, 504].includes(error.status));
      if (!read || !passing || attempt >= 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    }
  }
}

async function callOnce<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    // Cloudflare Access answers a request without a valid session with a redirect to its login page.
    response = await fetch(path, { ...init, redirect: 'manual' });
  } catch {
    throw new ApiError('サーバーに接続できません。通信の状態を確かめてください。', 0);
  }
  if (response.type === 'opaqueredirect') {
    throw new ApiError('ログインの有効期限が切れました。ページを再読み込みして、ログインし直してください。', 401);
  }
  const body = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
  if (!response.ok) {
    if (!body) {
      // Only the middleware answers without JSON: the API is off on this deployment.
      throw new ApiError('この URL では編集の API が使えません（本番の blog.etak64n.dev から開いてください）。', response.status);
    }
    throw new ApiError(body.error ?? `HTTP ${response.status}`, response.status);
  }
  return body as T;
}

export async function listPosts(): Promise<PostSummary[]> {
  return (await call<{ posts: PostSummary[] }>('/admin/api/posts')).posts;
}

/** The post `slug`, or null when the branch has none yet (a new post). */
export async function loadPost(slug: string): Promise<Post | null> {
  return (await call<{ post: Post | null }>(`/admin/api/post?slug=${encodeURIComponent(slug)}`)).post;
}

/** Stores an image (base64) on GitHub ahead of the save that adds it, and returns its blob SHA. */
export async function uploadImage(base64: string): Promise<string> {
  const body = `{"content":"${base64}","encoding":"base64"}`;
  const result = await call<{ sha: string }>('/admin/api/blob', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return result.sha;
}

export function savePost(slug: string, request: SaveRequest): Promise<SaveResult> {
  return call<SaveResult>(`/admin/api/post?slug=${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

/** URL of an image saved in the post's folder. */
export const imageUrl = (slug: string, name: string) =>
  `/admin/api/file?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`;
