/**
 * Rules for where a post lives. Each post is `src/content/blog/<slug>/<slug>.md` (or `.mdx`), and
 * is published at `/<slug>/`. The folder holds the post's images next to it.
 *
 * Shared by the content collection (src/content.config.ts) and `npm run new` (scripts/new-post.ts),
 * so this module must not import anything.
 */

/** Top-level paths of the site's own pages, which a post's URL must not take. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  '404',
  'about',
  'admin',
  'api',
  'archive',
  'feed',
  'images',
  'og',
  'page',
  'posts',
  'search',
  'tags',
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Why `slug` cannot be used for a post, or `undefined` when it can. */
export function slugProblem(slug: string): string | undefined {
  if (!SLUG_PATTERN.test(slug)) {
    return `slug は半角英小文字・数字と、語をつなぐハイフンで書いてください: ${slug}`;
  }
  if (RESERVED_SLUGS.has(slug)) {
    return `"${slug}" はサイトのページの URL と重なるため、記事の slug に使えません`;
  }
  return undefined;
}

/**
 * The slug of the post at `entry`, a path relative to src/content/blog. Throws (failing the build)
 * when the file is not `<slug>/<slug>.md` or `.mdx`, so that a misplaced file is reported instead of
 * being published under an unexpected URL.
 */
export function postSlugFromPath(entry: string): string {
  const match = /^([^/]+)\/([^/]+)\.mdx?$/.exec(entry);
  if (!match || match[1] !== match[2]) {
    throw new Error(
      `記事は src/content/blog/<slug>/<slug>.md に置いてください（フォルダー名とファイル名を同じにする）: ${entry}`,
    );
  }
  const slug = match[1];
  const problem = slugProblem(slug);
  if (problem) {
    throw new Error(`${problem}（${entry}）`);
  }
  return slug;
}
