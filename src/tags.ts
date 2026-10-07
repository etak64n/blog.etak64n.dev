/**
 * Tags that posts may use: slug (used in the URL /tags/<slug>/ and in front matter) → display name.
 *
 * A post naming a tag that is missing here fails the build, so a typo cannot create a new tag by
 * accident. To introduce a tag, add a line here.
 */
export const TAGS = {
  architecture: 'アーキテクチャ',
  astro: 'Astro',
  aws: 'AWS',
  cloudflare: 'Cloudflare',
  game: 'ゲーム',
  infra: 'インフラ',
  lambda: 'Lambda',
  linux: 'Linux',
  'make-famicom': 'ファミコンを作る',
  network: 'ネットワーク',
  nes: 'NES',
  nintendo: 'Nintendo',
  os: 'OS',
  workers: 'Workers',
} as const satisfies Record<string, string>;

export type TagSlug = keyof typeof TAGS;

export const TAG_SLUGS = Object.keys(TAGS) as [TagSlug, ...TagSlug[]];

for (const slug of TAG_SLUGS) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`src/tags.ts: タグの slug は半角英小文字・数字・ハイフンで書いてください: ${slug}`);
  }
}
