import { allTags } from '$lib/content/posts';

export const load = async () => {
  return { tags: allTags() };
};
