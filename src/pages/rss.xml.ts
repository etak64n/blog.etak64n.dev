import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPosts, postPath } from '../lib/posts.ts';
import { SITE } from '../site.ts';
import { TAGS } from '../tags.ts';

/** RSS 2.0 feed of the 50 newest posts. */
export const GET: APIRoute = async () => {
  const posts = (await getPosts()).slice(0, 50);
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: SITE.url,
    trailingSlash: true,
    customData: `<language>${SITE.lang}</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      link: postPath(post.id),
      pubDate: post.data.date,
      categories: post.data.tags.map((tag) => TAGS[tag]),
    })),
  });
};
