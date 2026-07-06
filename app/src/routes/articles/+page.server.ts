import { posts } from '$lib/content/posts';

export const load = async () => {
  return {
    posts: posts.map(({ body, ...meta }) => meta)
  };
};
