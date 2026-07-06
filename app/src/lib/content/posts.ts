import matter from 'gray-matter';

export interface QuizAnswer {
  text: string;
  correct: boolean;
  explanation?: string;
}
export interface Quiz {
  question: string;
  answers: QuizAnswer[];
}
export interface Thumbnail {
  url: string;
  title?: string;
}
export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  updated?: string;
  draft: boolean;
  description?: string;
  tags: string[];
  thumbnail?: Thumbnail | null;
  audio?: string | null;
  quizzes?: Quiz[];
}
export interface Post extends PostMeta {
  body: string;
}

// Bundle all markdown at build time (works on Cloudflare; content is inlined).
const raws = import.meta.glob('/src/content/blogPost/**/index.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

function slugFromPath(p: string): string {
  const m = p.match(/blogPost\/([^/]+)\/index\.md$/);
  return m ? m[1] : p;
}

function normalizeDate(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d ?? '');
}

const all: Post[] = Object.entries(raws).map(([p, raw]) => {
  const { data, content } = matter(raw);
  return {
    slug: slugFromPath(p),
    title: data.title ?? '(untitled)',
    date: normalizeDate(data.date),
    updated: data.updated ? normalizeDate(data.updated) : undefined,
    draft: Boolean(data.draft),
    description: data.description ?? '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    thumbnail: data.thumbnail ?? null,
    audio: data.audio ?? null,
    quizzes: Array.isArray(data.quizzes) ? data.quizzes : [],
    body: content
  } satisfies Post;
});

const isDev = import.meta.env.DEV;

/** Published posts (drafts hidden in production), newest first. */
export const posts: Post[] = all
  .filter((p) => isDev || !p.draft)
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function allTags(): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of posts) for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
}

export function postsByTag(tag: string): Post[] {
  return posts.filter((p) => p.tags.includes(tag));
}
