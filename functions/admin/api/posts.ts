/** GET /admin/api/posts: the posts on the editor's branch, newest first, as `{ posts }`. */
import { json, route } from '../../_lib/http.ts';
import { listPosts } from '../../_lib/posts.ts';

export const onRequestGet = route(async (_request, config) => json({ posts: await listPosts(config) }));
