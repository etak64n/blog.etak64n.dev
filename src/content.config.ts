import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { postSlugFromPath } from './lib/post-path.ts';
import { TAG_SLUGS } from './tags.ts';

const blog = defineCollection({
  loader: glob({
    base: './src/content/blog',
    // Every Markdown file is matched so that a misplaced one fails in postSlugFromPath instead of
    // being skipped.
    pattern: '**/*.{md,mdx}',
    generateId: ({ entry }) => postSlugFromPath(entry),
  }),
  schema: ({ image }) =>
    z
      .strictObject({
        title: z.string().trim().min(1),
        /** Summary for lists, search results and link previews; may stay empty while drafting. */
        description: z.string().trim(),
        /** Publication date; posts are listed newest first. */
        date: z.coerce.date(),
        /** Date of the last meaningful revision, shown next to the publication date. */
        updated: z.coerce.date().optional(),
        tags: z.array(
          z.enum(TAG_SLUGS, {
            error: (issue) => `未登録のタグです: ${String(issue.input)}（src/tags.ts に追加してください）`,
          }),
        ),
        /** `true` keeps the post out of the production site; `astro dev` and previews show it. */
        draft: z.boolean(),
        /** Image for link previews, relative to the post (e.g. `./og.png`); cropped to 1200×630. */
        ogImage: image().optional(),
      })
      .superRefine((post, ctx) => {
        if (post.updated && post.updated < post.date) {
          ctx.addIssue({ code: 'custom', path: ['updated'], message: 'updated は date 以降の日付にしてください' });
        }
        if (new Set(post.tags).size !== post.tags.length) {
          ctx.addIssue({ code: 'custom', path: ['tags'], message: '同じタグが重複しています' });
        }
        if (!post.draft) {
          if (!post.description) {
            ctx.addIssue({ code: 'custom', path: ['description'], message: '公開する記事には description が必要です' });
          }
          if (post.tags.length === 0) {
            ctx.addIssue({ code: 'custom', path: ['tags'], message: '公開する記事にはタグが 1 つ以上必要です' });
          }
        }
      }),
});

export const collections = { blog };
