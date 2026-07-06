import { posts } from '$lib/content/posts';

export const load = async () => {
  return {
    posts: posts.slice(0, 12).map(({ body, ...meta }) => meta)
  };
};
