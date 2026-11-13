import { defineMiddleware } from "astro:middleware";
import { IMAGE_CACHE_SECONDS, PAGE_CACHE_SECONDS } from "./site";

// Two jobs, in this order:
//
// 1. Pages end in a slash, as on the previous site (/articles/<slug>/), and a URL without it is sent
//    to the one with it. EmDash's routes (/_emdash/…), Astro's (/_image, /_astro/…), files, and the
//    error pages that pages rewrite to (Astro.rewrite("/404") runs this middleware again) are left
//    alone.
// 2. Public pages are kept for PAGE_CACHE_SECONDS in the cache of the Cloudflare data center that
//    served them (the Cache API), so a page viewed again there costs no D1 reads. Resized images
//    (/_image) are kept for IMAGE_CACHE_SECONDS there and in the browser, so an image shown again
//    costs no R2 read nor resizing. Signed-in editors and previews always get fresh ones.

const ERROR_PAGES = new Set(["/404", "/500"]);

/** The cookie EmDash's sign-in uses (Astro's session cookie). */
const SESSION_COOKIE = "astro-session";

/** Astro's image endpoint, which EmDash serves from R2 through the Images binding. */
const IMAGE_ENDPOINT = "/_image";

const PAGE_TYPES = ["text/html", "application/xml", "application/rss+xml"];

/** Whether the request is for a public page or image that every visitor sees the same way. */
function isCacheableRequest(request: Request, url: URL): boolean {
	if (request.method !== "GET") return false;
	const isImage = url.pathname === IMAGE_ENDPOINT;
	if (!isImage && (url.pathname.startsWith("/_") || url.pathname.startsWith("/."))) return false;
	if (url.searchParams.has("_preview")) return false;
	const cookies = request.headers.get("cookie") ?? "";
	return !cookies.split(";").some((cookie) => cookie.trim().startsWith(`${SESSION_COOKIE}=`));
}

function isCacheableResponse(response: Response, isImage: boolean): boolean {
	if (response.status !== 200 || response.headers.has("set-cookie")) return false;
	const type = response.headers.get("content-type") ?? "";
	return isImage ? type.startsWith("image/") : PAGE_TYPES.some((cacheable) => type.startsWith(cacheable));
}

/**
 * Pages: browsers revalidate every time, so a visitor never keeps a page longer than the data center
 * does. Images: browsers keep them for IMAGE_CACHE_SECONDS.
 */
function forBrowser(response: Response, state: "HIT" | "MISS", isImage: boolean): Response {
	const headers = new Headers(response.headers);
	headers.set("Cache-Control", isImage ? `public, max-age=${IMAGE_CACHE_SECONDS}` : "public, max-age=0, must-revalidate");
	headers.set("X-Page-Cache", state);
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname, search } = context.url;
	const leftAlone =
		pathname.endsWith("/") ||
		pathname.startsWith("/_") ||
		pathname.startsWith("/.") ||
		/\.[A-Za-z0-9]+$/.test(pathname) ||
		ERROR_PAGES.has(pathname);
	if (!leftAlone) return context.redirect(`${pathname}/${search}`, 301);

	if (!isCacheableRequest(context.request, context.url)) return next();
	const isImage = pathname === IMAGE_ENDPOINT;

	const cache = (globalThis.caches as unknown as { default: Cache }).default;
	const key = new Request(context.url.toString(), { method: "GET" });
	const cached = await cache.match(key);
	if (cached) return forBrowser(cached, "HIT", isImage);

	const response = await next();
	if (!isCacheableResponse(response, isImage)) return response;

	const stored = new Response(response.clone().body, response);
	stored.headers.set("Cache-Control", `public, max-age=${isImage ? IMAGE_CACHE_SECONDS : PAGE_CACHE_SECONDS}`);
	const put = cache.put(key, stored);
	const waitUntil = context.locals.cfContext?.waitUntil?.bind(context.locals.cfContext);
	if (waitUntil) waitUntil(put);
	else await put;
	return forBrowser(response, "MISS", isImage);
});
