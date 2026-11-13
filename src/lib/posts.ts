import { getEmDashCollection, getTaxonomyTerms } from "emdash";
import { POSTS_PER_PAGE, RELATED_IGNORED_TAGS, RELATED_POSTS } from "../site";

type CollectionResult = Awaited<ReturnType<typeof getEmDashCollection<"posts">>>;
export type Post = CollectionResult["entries"][number];
export type Tag = { slug: string; label: string };

/** Posts are at /articles/<slug>/, as on the previous site. */
export const postPath = (slug: string) => `/articles/${slug}/`;
export const tagPath = (slug: string) => `/tags/${encodeURIComponent(slug)}/`;
/** Page n of a list whose first page is at `base`: `<base>page/<n>/`. */
export const listPagePath = (base: string, n: number) => (n === 1 ? base : `${base}page/${n}/`);

/** When the post was published; a draft shown in preview has no date yet, so its creation date stands in. */
export const postDate = (post: Post): Date => post.data.publishedAt ?? post.data.createdAt;

/** The tags of a post. Entries come with their terms, so this costs no query. */
export const postTags = (post: Post): Tag[] =>
	(post.data.terms?.tag ?? []).map((term) => ({ slug: term.slug, label: term.label }));

// Every query below reads only the posts the page shows: the cost of a page view stays the same as
// the blog grows. The D1 read allowance is shared by every database on the account.

async function query(options: Parameters<typeof getEmDashCollection<"posts">>[1]) {
	const result = await getEmDashCollection("posts", {
		status: "published",
		orderBy: { published_at: "desc" },
		...options,
	});
	if (result.error) throw result.error;
	return result;
}

/** The newest published posts. */
export async function getLatestPosts(limit: number) {
	const { entries, cacheHint } = await query({ limit });
	return { posts: entries, cacheHint };
}

/**
 * Page `page` of the published posts, newest first, optionally with a tag. Without a total count,
 * `hasMore` tells whether a next page exists.
 */
export async function getPostsPage(page: number, tag?: string) {
	const { entries, cacheHint, hasMore } = await query({
		limit: POSTS_PER_PAGE,
		offset: (page - 1) * POSTS_PER_PAGE,
		...(tag ? { where: { tag } } : {}),
	});
	return { posts: entries, cacheHint, hasMore: hasMore === true };
}

/** Published posts by database ID (`post.data.id`), in the order of `ids`. */
export async function getPostsByIds(ids: string[]) {
	if (ids.length === 0) return [];
	const { entries } = await query({ where: { id: ids }, limit: ids.length });
	const byId = new Map(entries.map((post) => [post.data.id, post]));
	return ids.flatMap((id) => byId.get(id) ?? []);
}

/**
 * Posts sharing the most tags with `post` (tags in RELATED_IGNORED_TAGS do not count), newest first
 * among equals. Without any, the newest other posts.
 */
export async function getRelatedPosts(post: Post): Promise<Post[]> {
	const own = postTags(post)
		.map((tag) => tag.slug)
		.filter((slug) => !RELATED_IGNORED_TAGS.includes(slug));
	const isOther = (other: Post) => other.data.id !== post.data.id;

	if (own.length > 0) {
		// Candidates: the newest posts that carry any of the tags.
		const { entries } = await query({ where: { tag: own }, limit: 20 });
		const scored = entries
			.filter(isOther)
			.map((other, index) => ({
				other,
				index,
				score: postTags(other).filter((tag) => own.includes(tag.slug)).length,
			}))
			.sort((a, b) => b.score - a.score || a.index - b.index)
			.map(({ other }) => other);
		if (scored.length > 0) return scored.slice(0, RELATED_POSTS);
	}

	const { entries } = await query({ limit: RELATED_POSTS + 1 });
	return entries.filter(isOther).slice(0, RELATED_POSTS);
}

/** Tags on at least one published post, with their counts, in the order of their slugs. */
export async function getUsedTags() {
	const terms = await getTaxonomyTerms("tag", { includeCounts: true });
	return terms
		.filter((term) => (term.count ?? 0) > 0)
		.map((term) => ({ slug: term.slug, label: term.label, count: term.count ?? 0 }))
		.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Reads `<n>` of a /page/<n>/ URL; null when it is not a page number after the first. */
export function readPageNumber(value: string | undefined): number | null {
	if (!value || !/^[1-9][0-9]*$/.test(value)) return null;
	const n = Number(value);
	return n >= 2 ? n : null;
}
