/** Site-wide settings used by the layout and the pages. */

/** The language of the pages. Set here rather than with Astro's i18n, which would key EmDash content by locale. */
export const SITE_LANG = "ja";

/** Used until the site title is set in the EmDash settings. */
export const DEFAULT_SITE_TITLE = "etak64n's blog";

/** The author named in the footer. */
export const AUTHOR = "etak64n";

/** Posts on the home page. */
export const HOME_POSTS = 10;

/** Magazines on the home page; /magazines/ lists them all. */
export const HOME_MAGAZINES = 8;

/** Posts in the RSS feed. */
export const FEED_POSTS = 20;

/**
 * How long a Cloudflare data center keeps a public page (src/middleware.ts). A published or edited
 * post reaches visitors within this time; signed-in editors see it at once. Each kept page saves the
 * D1 reads of rendering it again.
 */
export const PAGE_CACHE_SECONDS = 300;

/**
 * How long a Cloudflare data center, and then the browser, keeps a resized image (/_image, see
 * src/middleware.ts). Each kept image saves a Worker request and an R2 read; an image replaced in the
 * media library in place can take up to twice this time to reach visitors.
 */
export const IMAGE_CACHE_SECONDS = 86400;

/** Posts per page on /articles/ and on tag pages. */
export const POSTS_PER_PAGE = 20;

/** Related posts under an article. */
export const RELATED_POSTS = 4;

/** The newest posts sharing a tag that the related posts are picked from. */
export const RELATED_CANDIDATES = 8;

/** Tags on so many posts that sharing one does not make two posts related. */
export const RELATED_IGNORED_TAGS = ["aws"];

/** Shown in place of the featured image of a post that has none, on its card and at its top; in public/. */
export const HERO_PLACEHOLDER = { path: "/images/hero/placeholder.svg", width: 1200, height: 630 } as const;

/**
 * `sizes` of an image as wide as the article text: 760px from 1180px up, sharing the row with
 * the table of contents from 1101px, and the whole width below that.
 */
export const CONTENT_IMAGE_SIZES =
	"(min-width: 1180px) 760px, (min-width: 1101px) calc(100vw - 420px), calc(100vw - 86px)";
