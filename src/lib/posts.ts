import { getCollection, type CollectionEntry } from 'astro:content';
import { SHOW_DRAFTS } from 'astro:env/server';
import { TAGS, type TagSlug } from '../tags.ts';

export type Post = CollectionEntry<'blog'>;

/** Drafts are listed by `astro dev` and by builds with SHOW_DRAFTS=true (pull request previews). */
export const showDrafts = import.meta.env.DEV || SHOW_DRAFTS;

/**
 * Published posts, newest first. Posts with the same date are ordered by slug, descending, so that a
 * numbered series reads newest first like the rest of the list.
 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => showDrafts || !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || b.id.localeCompare(a.id));
}

export const postPath = (slug: string) => `/${slug}/`;

export const tagPath = (tag: TagSlug) => `/tags/${tag}/`;

/** Tags used by `posts` with their post counts, most used first. */
export function tagCounts(posts: Post[]): { tag: TagSlug; count: number }[] {
  const counts = new Map<TagSlug, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || TAGS[a.tag].localeCompare(TAGS[b.tag], 'ja'));
}

/** Up to `limit` other posts sharing the most tags with `post`; newer posts win ties. */
export function relatedPosts(post: Post, posts: Post[], limit: number): Post[] {
  const tags = new Set(post.data.tags);
  return posts
    .filter((other) => other.id !== post.id)
    .map((other) => ({ other, shared: other.data.tags.filter((tag) => tags.has(tag)).length }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map(({ other }) => other);
}

/**
 * Estimated reading time in minutes for Japanese prose at about 500 characters a minute. Code blocks,
 * URLs and Markdown syntax are left out of the count.
 */
export function readingMinutes(markdown: string): number {
  const text = markdown
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\S\n]*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/<[^>]+>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\s#>*_`|~\-[\]]/g, '');
  return Math.max(1, Math.round(text.length / 500));
}

/** Page URLs of the site end with a slash; Cloudflare Pages redirects the other form to it. */
export const withTrailingSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);
