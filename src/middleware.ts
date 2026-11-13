import { defineMiddleware } from "astro:middleware";

// Pages end in a slash, as on the previous site (/articles/<slug>/), and a URL without it is sent to
// the one with it. EmDash's routes (/_emdash/…), Astro's (/_image, /_astro/…), files, and the error
// pages that pages rewrite to (Astro.rewrite("/404") runs this middleware again) are left alone.
const ERROR_PAGES = new Set(["/404", "/500"]);

export const onRequest = defineMiddleware((context, next) => {
	const { pathname, search } = context.url;
	if (
		pathname.endsWith("/") ||
		pathname.startsWith("/_") ||
		pathname.startsWith("/.") ||
		/\.[A-Za-z0-9]+$/.test(pathname) ||
		ERROR_PAGES.has(pathname)
	) {
		return next();
	}
	return context.redirect(`${pathname}/${search}`, 301);
});
