import { getEmDashCollection, getTermsForEntries } from "emdash";
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

/**
 * Every published post, newest first. The blog has a few dozen posts at most, so pages fetch them all
 * once and slice, which also gives the page count and the tag counts.
 */
export async function getPublishedPosts() {
	const { entries, cacheHint, error } = await getEmDashCollection("posts", {
		status: "published",
		orderBy: { published_at: "desc" },
		limit: 500,
	});
	if (error) throw error;
	return { posts: entries, cacheHint };
}

/** The tags of each post, keyed by the post's database ID (`post.data.id`). */
export async function getPostTags(posts: Post[]): Promise<Map<string, Tag[]>> {
	const terms = await getTermsForEntries(
		"posts",
		posts.map((post) => post.data.id),
		"tag",
	);
	const tags = new Map<string, Tag[]>();
	for (const [id, list] of terms) {
		tags.set(
			id,
			list.map((term) => ({ slug: term.slug, label: term.label })),
		);
	}
	return tags;
}

/** One page of a list, and the number of pages. */
export function paginate<T>(items: T[], page: number) {
	const lastPage = Math.max(1, Math.ceil(items.length / POSTS_PER_PAGE));
	const start = (page - 1) * POSTS_PER_PAGE;
	return { items: items.slice(start, start + POSTS_PER_PAGE), lastPage };
}

/** Reads `<n>` of a /page/<n>/ URL; null when it is not a page number after the first. */
export function readPageNumber(value: string | undefined): number | null {
	if (!value || !/^[1-9][0-9]*$/.test(value)) return null;
	const n = Number(value);
	return n >= 2 ? n : null;
}

/**
 * Posts sharing the most tags with `post` (tags in RELATED_IGNORED_TAGS do not count), newest first
 * among equals. Without any, the newest other posts.
 */
export function relatedPosts(post: Post, posts: Post[], tags: Map<string, Tag[]>): Post[] {
	const own = new Set(
		(tags.get(post.data.id) ?? [])
			.map((tag) => tag.slug)
			.filter((slug) => !RELATED_IGNORED_TAGS.includes(slug)),
	);
	const others = posts.filter((other) => other.data.id !== post.data.id);
	const scored = others
		.map((other, index) => ({
			other,
			index,
			score: (tags.get(other.data.id) ?? []).filter((tag) => own.has(tag.slug)).length,
		}))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.map(({ other }) => other);
	return (scored.length > 0 ? scored : others).slice(0, RELATED_POSTS);
}
