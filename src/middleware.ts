import { defineMiddleware } from "astro:middleware";
import { PAGE_CACHE_SECONDS } from "./site";

// Two jobs, in this order:
//
// 1. Pages end in a slash, as on the previous site (/articles/<slug>/), and a URL without it is sent
//    to the one with it. EmDash's routes (/_emdash/…), Astro's (/_image, /_astro/…), files, and the
//    error pages that pages rewrite to (Astro.rewrite("/404") runs this middleware again) are left
//    alone.
// 2. Public pages are kept for PAGE_CACHE_SECONDS in the cache of the Cloudflare data center that
//    served them (the Cache API), so a page viewed again there costs no D1 reads. Signed-in editors
//    and previews always get a fresh page.

const ERROR_PAGES = new Set(["/404", "/500"]);

/** The cookie EmDash's sign-in uses (Astro's session cookie). */
const SESSION_COOKIE = "astro-session";

const CACHEABLE_TYPES = ["text/html", "application/xml", "application/rss+xml"];

/** Whether the request is for a public page that every visitor sees the same way. */
function isCacheableRequest(request: Request, url: URL): boolean {
	if (request.method !== "GET") return false;
	if (url.pathname.startsWith("/_") || url.pathname.startsWith("/.")) return false;
	if (url.searchParams.has("_preview")) return false;
	const cookies = request.headers.get("cookie") ?? "";
	return !cookies.split(";").some((cookie) => cookie.trim().startsWith(`${SESSION_COOKIE}=`));
}

function isCacheableResponse(response: Response): boolean {
	if (response.status !== 200 || response.headers.has("set-cookie")) return false;
	const type = response.headers.get("content-type") ?? "";
	return CACHEABLE_TYPES.some((cacheable) => type.startsWith(cacheable));
}

/** Browsers revalidate every time, so a visitor never keeps a page longer than the data center does. */
function forBrowser(response: Response, state: "HIT" | "MISS"): Response {
	const headers = new Headers(response.headers);
	headers.set("Cache-Control", "public, max-age=0, must-revalidate");
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

	const cache = (globalThis.caches as unknown as { default: Cache }).default;
	const key = new Request(context.url.toString(), { method: "GET" });
	const cached = await cache.match(key);
	if (cached) return forBrowser(cached, "HIT");

	const response = await next();
	if (!isCacheableResponse(response)) return response;

	const stored = new Response(response.clone().body, response);
	stored.headers.set("Cache-Control", `public, max-age=${PAGE_CACHE_SECONDS}`);
	const put = cache.put(key, stored);
	const waitUntil = context.locals.cfContext?.waitUntil?.bind(context.locals.cfContext);
	if (waitUntil) waitUntil(put);
	else await put;
	return forBrowser(response, "MISS");
});
