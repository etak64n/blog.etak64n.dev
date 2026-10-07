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
  /** Source links on each post point here. */
  repository: 'https://github.com/etak64n/blog.etak64n.dev',
  branch: 'main',
} as const;

/**
 * Width of the article column in CSS pixels. Markdown images are generated at this width and at
 * twice it (for high-density screens). `--content-width` in src/styles/global.css must match.
 */
export const CONTENT_WIDTH = 720;

/** Posts per page on /posts/ and on tag pages. */
export const POSTS_PER_PAGE = 20;

/** Image used for link previews (Open Graph) when a post has no `ogImage`; lives in public/. */
export const DEFAULT_OG_IMAGE = {
  path: '/og-default.png',
  width: 1200,
  height: 630,
  alt: "etak64n's blog",
} as const;
