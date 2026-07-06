import { allTags, postsByTag } from '$lib/content/posts';

export const entries = () => allTags().map(({ tag }) => ({ tag }));

export const load = async ({ params }) => {
  const tag = params.tag;
  return {
    tag,
    posts: postsByTag(tag).map(({ body, ...meta }) => meta)
  };
};
