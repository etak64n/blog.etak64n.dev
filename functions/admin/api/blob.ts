/**
 * POST /admin/api/blob: stores an image as a Git blob, ahead of the save that adds it to the post,
 * and answers `{ sha }`. The body is already GitHub's request, `{"content":"<base64>","encoding":
 * "base64"}`: the browser encodes the image, so the Function passes it on without parsing it.
 */
import { rest } from '../../_lib/github.ts';
import { RequestError, json, route } from '../../_lib/http.ts';

const MAX_BODY_LENGTH = 20_000_000;
const PREFIX = '{"content":"';
const SUFFIX = '","encoding":"base64"}';

export const onRequestPost = route(async (request, config) => {
  const body = await request.text();
  if (body.length > MAX_BODY_LENGTH) throw new RequestError('画像が大きすぎます', 413);
  if (!body.startsWith(PREFIX) || !body.endsWith(SUFFIX)) {
    throw new RequestError('画像の送り方が正しくありません', 400);
  }
  const blob = await rest<{ sha: string }>(config, 'POST', '/git/blobs', body);
  return json({ sha: blob.sha });
});
