/**
 * GET /admin/api/post?slug=<slug>: the post as `{ post }`, null when the branch has none.
 * PUT /admin/api/post?slug=<slug>: saves the post (body: SaveRequest) as one commit and answers
 * SaveResult, or 409 with `{ error }` when the save was refused to keep a change made on GitHub.
 */
import { slugProblem } from '../../../src/lib/post-path.ts';
import { RequestError, json, route } from '../../_lib/http.ts';
import { IMAGE_NAME, loadPost, savePost, type SaveRequest } from '../../_lib/posts.ts';

const SHA = /^[0-9a-f]{40}$/;
const MAX_TEXT_LENGTH = 2_000_000;

function slugOf(request: Request): string {
  const slug = new URL(request.url).searchParams.get('slug') ?? '';
  const problem = slugProblem(slug);
  if (problem) throw new RequestError(problem, 400);
  return slug;
}

function saveRequest(body: unknown): SaveRequest {
  const invalid = () => new RequestError('保存する内容の形式が正しくありません', 400);
  if (body === null || typeof body !== 'object') throw invalid();
  const { text, base, images } = body as Record<string, unknown>;
  if (typeof text !== 'string' || text.length > MAX_TEXT_LENGTH) throw invalid();
  let baseSha: string | null;
  if (base === null) baseSha = null;
  else if (typeof base === 'string' && SHA.test(base)) baseSha = base;
  else throw invalid();
  if (!Array.isArray(images)) throw invalid();
  const list = images.map((image: unknown) => {
    const { name, sha } = (image ?? {}) as Record<string, unknown>;
    if (typeof name !== 'string' || !IMAGE_NAME.test(name)) throw invalid();
    if (typeof sha !== 'string' || !SHA.test(sha)) throw invalid();
    return { name, sha };
  });
  if (new Set(list.map((image) => image.name)).size !== list.length) throw invalid();
  return { text, base: baseSha, images: list };
}

export const onRequestGet = route(async (request, config) =>
  json({ post: await loadPost(config, slugOf(request)) }),
);

export const onRequestPut = route(async (request, config) => {
  const slug = slugOf(request);
  const body = saveRequest(await request.json().catch(() => null));
  const result = await savePost(config, slug, body);
  return 'conflict' in result ? json({ error: result.conflict }, 409) : json(result);
});
