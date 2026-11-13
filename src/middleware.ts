import { defineMiddleware } from "astro:middleware";

// Pages end in a slash, as on the previous site (/articles/<slug>/), and a URL without it is sent to
// the one with it. EmDash's routes (/_emdash/…), Astro's (/_image, /_astro/…) and files are left alone.
export const onRequest = defineMiddleware((context, next) => {
	const { pathname, search } = context.url;
	if (pathname.endsWith("/") || pathname.startsWith("/_") || pathname.startsWith("/.") || /\.[A-Za-z0-9]+$/.test(pathname)) {
		return next();
	}
	return context.redirect(`${pathname}/${search}`, 301);
});
