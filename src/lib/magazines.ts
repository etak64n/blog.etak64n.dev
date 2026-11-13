import { getEmDashCollection, getEmDashEntry } from "emdash";
import type { Post } from "./posts";

type MagazineResult = Awaited<ReturnType<typeof getEmDashCollection<"magazines">>>;
export type Magazine = MagazineResult["entries"][number];

/** Magazines are at /magazines/<slug>/. */
export const magazinePath = (slug: string) => `/magazines/${slug}/`;

/** The most posts a magazine page lists; a magazine is a series, not an archive. */
const MAGAZINE_POSTS = 100;

/** Published magazines, newest first. */
export async function getMagazines(limit: number) {
	const { entries, cacheHint, error } = await getEmDashCollection("magazines", {
		status: "published",
		orderBy: { published_at: "desc" },
		limit,
	});
	// A failed query leaves the magazines out rather than failing the page they appear on.
	if (error) console.error("[magazines] could not list magazines:", error);
	return { magazines: entries, cacheHint };
}

/** A magazine and its published posts, in the order chosen in the admin. */
export async function getMagazine(slug: string) {
	const { entry, cacheHint, error } = await getEmDashEntry("magazines", slug, {
		references: { posts: { limit: MAGAZINE_POSTS } },
	});
	if (error) throw error;
	return {
		magazine: entry,
		posts: (entry?.references?.posts?.entries ?? []) as Post[],
		cacheHint,
	};
}

/** The posts before and after `post` in a list. */
export function neighbours(posts: Post[], post: Post) {
	const index = posts.findIndex((other) => other.data.id === post.data.id);
	if (index < 0) return { previous: undefined, next: undefined };
	return { previous: posts[index - 1], next: posts[index + 1] };
}
