/** Site-wide settings used by layouts, feeds and structured data. */
export const SITE = {
  url: 'https://blog.etak64n.dev',
  title: "etak64n's blog",
  description: 'AWS・Cloudflare・インフラ・OS・ネットワークを中心にした技術ブログ',
  lang: 'ja',
  locale: 'ja_JP',
  author: {
    name: 'etak64n',
    url: 'https://github.com/etak64n',
  },
  /** Repository of the site's source. */
  repository: 'https://github.com/etak64n/blog.etak64n.dev',
} as const;

/**
 * Width of the article text in CSS pixels on wide screens (`.page-body` in src/styles/global.css).
 * Markdown images are generated at this width and at twice it, for high-density screens.
 */
export const CONTENT_WIDTH = 760;

/**
 * `sizes` of images in the article text: the text column is 760px wide from 1180px up, shares the
 * row with the table of contents from 1101px, and takes the whole width below that.
 */
export const CONTENT_IMAGE_SIZES = `(min-width: 1180px) ${CONTENT_WIDTH}px, (min-width: 1101px) calc(100vw - 420px), calc(100vw - 86px)`;

/** Posts on the home page. */
export const HOME_POSTS = 10;

/** Posts per page on /posts/ and on tag pages. */
export const POSTS_PER_PAGE = 20;

/** Shown in place of the hero image of a post that has none, on its card and at its top; in public/. */
export const HERO_PLACEHOLDER = { path: '/images/placeholder.svg', width: 1200, height: 630 } as const;

/** Image used for link previews (Open Graph) when a post has no hero image; in public/. */
export const DEFAULT_OG_IMAGE = {
  path: '/og-default.png',
  width: 1200,
  height: 630,
  alt: "etak64n's blog",
} as const;
