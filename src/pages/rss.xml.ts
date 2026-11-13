// The RSS feed: the newest published posts, with their excerpts.
import type { APIRoute } from "astro";
import { getSiteSettings } from "emdash";
import { getLatestPosts, postDate, postPath } from "../lib/posts";
import { DEFAULT_SITE_TITLE, FEED_POSTS, SITE_LANG } from "../site";

const escapeXml = (text: string) =>
	text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");

export const GET: APIRoute = async ({ site }) => {
	const base = site ?? new URL("https://blog.etak64n.dev");
	const [settings, { posts }] = await Promise.all([getSiteSettings(), getLatestPosts(FEED_POSTS)]);
	const title = settings?.title || DEFAULT_SITE_TITLE;
	const description = settings?.tagline ?? "";

	const items = posts.map((post) => {
		const url = new URL(postPath(post.id), base).href;
		return [
			"    <item>",
			`      <title>${escapeXml(post.data.title)}</title>`,
			`      <link>${escapeXml(url)}</link>`,
			`      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
			`      <pubDate>${postDate(post).toUTCString()}</pubDate>`,
			...(post.data.excerpt ? [`      <description>${escapeXml(post.data.excerpt)}</description>`] : []),
			"    </item>",
		].join("\n");
	});

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
		"  <channel>",
		`    <title>${escapeXml(title)}</title>`,
		`    <link>${escapeXml(new URL("/", base).href)}</link>`,
		`    <description>${escapeXml(description)}</description>`,
		`    <language>${SITE_LANG}</language>`,
		`    <atom:link href="${escapeXml(new URL("/rss.xml", base).href)}" rel="self" type="application/rss+xml"/>`,
		...items,
		"  </channel>",
		"</rss>",
	].join("\n");

	return new Response(body, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
