// The sitemap, as on the previous site: the home page, the post list, every post and every tag page,
// at their canonical URLs (with the trailing slash). Replaces EmDash's sitemap index, whose post URLs
// drop the slash and so would each answer with a redirect.
import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";
import { getUsedTags, postPath, tagPath } from "../lib/posts";

const escapeXml = (text: string) =>
	text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export const GET: APIRoute = async ({ site }) => {
	const base = site ?? new URL("https://blog.etak64n.dev");
	// The only route that reads every post; crawlers fetch it now and then.
	const { entries: posts, error } = await getEmDashCollection("posts", {
		status: "published",
		orderBy: { published_at: "desc" },
		limit: 1000,
	});
	if (error) throw error;
	const tags = (await getUsedTags()).map((tag) => tag.slug);

	const entries: { path: string; lastmod?: Date }[] = [
		{ path: "/", lastmod: posts[0]?.data.updatedAt },
		{ path: "/articles/", lastmod: posts[0]?.data.updatedAt },
		...posts.map((post) => ({ path: postPath(post.id), lastmod: post.data.updatedAt })),
		{ path: "/tags/" },
		...tags.map((slug) => ({ path: tagPath(slug) })),
	];

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...entries.map(({ path, lastmod }) =>
			[
				"  <url>",
				`    <loc>${escapeXml(new URL(path, base).href)}</loc>`,
				...(lastmod ? [`    <lastmod>${lastmod.toISOString()}</lastmod>`] : []),
				"  </url>",
			].join("\n"),
		),
		"</urlset>",
	].join("\n");

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
