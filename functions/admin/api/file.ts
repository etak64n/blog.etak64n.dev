/**
 * GET /admin/api/file?slug=<slug>&name=<name>: an image in the post's folder on the editor's
 * branch, for the editor to show. Images added in the editor and not saved yet come from the
 * browser instead.
 */
import { POSTS_DIR, slugProblem } from '../../../src/lib/post-path.ts';
import { rawFile } from '../../_lib/github.ts';
import { RequestError, route } from '../../_lib/http.ts';
import { IMAGE_NAME } from '../../_lib/posts.ts';

const TYPES: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};

export const onRequestGet = route(async (request, config) => {
  const params = new URL(request.url).searchParams;
  const slug = params.get('slug') ?? '';
  const name = params.get('name') ?? '';
  if (slugProblem(slug) || !IMAGE_NAME.test(name)) {
    throw new RequestError('画像の指定が正しくありません', 400);
  }
  const response = await rawFile(config, `${POSTS_DIR}/${slug}/${name}`);
  if (!response.ok) {
    throw new RequestError(`画像を読み込めません（GitHub: HTTP ${response.status}）`, response.status === 404 ? 404 : 502);
  }
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  return new Response(response.body, {
    headers: {
      'Content-Type': TYPES[extension] ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
