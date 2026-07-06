import { error } from '@sveltejs/kit';
import { getPost, posts } from '$lib/content/posts';
import { renderMarkdown } from '$lib/content/markdown';

export const entries = () => posts.map((p) => ({ slug: p.slug }));

export const load = async ({ params }) => {
  const post = getPost(params.slug);
  if (!post) throw error(404, 'Not found');
  const { html, toc } = await renderMarkdown(post.body, post.slug);
  const { body, ...meta } = post;
  return { post: meta, html, toc };
};
