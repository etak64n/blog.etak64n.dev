/**
 * The posts on the editor's branch, read and saved with GitHub's APIs. A post is the file
 * `<POSTS_DIR>/<slug>/<slug>.md` (or `.mdx`), with its images in the same folder (src/lib/post-path.ts).
 */
import { frontmatterFields } from '../../src/lib/frontmatter.ts';
import { POSTS_DIR } from '../../src/lib/post-path.ts';
import type { Config } from './config.ts';
import { GitHubError, commitUrl, graphql, rest } from './github.ts';

export interface PostSummary {
  slug: string;
  title: string;
  /** `date` of the front matter as written (`YYYY-MM-DD`). */
  date: string;
  draft: boolean;
}

export interface Post {
  slug: string;
  /** File name of the post in its folder: `<slug>.md` or `<slug>.mdx`. */
  file: string;
  text: string;
  /** Git blob SHA of the text. A save replaces the post only while GitHub still has this text. */
  sha: string;
  /** Names of the other files in the post's folder (its images). */
  files: string[];
}

export interface SaveRequest {
  text: string;
  /** `Post.sha` of the text being replaced, or null to create the post. */
  base: string | null;
  /** Images added in the editor, already uploaded as blobs: file name in the folder and blob SHA. */
  images: { name: string; sha: string }[];
}

export interface SaveResult {
  /** SHA of the saved text, the `base` of the next save. */
  sha: string;
  commit: string;
  commitUrl: string;
}

/** Why a save was refused without changing anything. */
export interface SaveConflict {
  conflict: string;
}

/** File names that images in a post's folder may have. */
export const IMAGE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

const isPostFile = (slug: string, name: string) => name === `${slug}.md` || name === `${slug}.mdx`;

interface Entry<T> {
  name: string;
  oid: string;
  object?: T | null;
}

interface Tree<T> {
  entries?: Entry<T>[];
}

interface Blob {
  text?: string | null;
  isTruncated?: boolean;
}

/** Each post folder with the text of its files (null for images). */
const LIST_QUERY = `query ($owner: String!, $repo: String!, $expression: String!) {
  repository(owner: $owner, name: $repo) {
    object(expression: $expression) {
      ... on Tree {
        entries {
          name
          oid
          object {
            ... on Tree {
              entries {
                name
                oid
                object {
                  ... on Blob {
                    text
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

export async function listPosts(config: Config): Promise<PostSummary[]> {
  const data = await graphql<{ repository: { object: Tree<Tree<Blob>> | null } | null }>(config, LIST_QUERY, {
    expression: `${config.branch}:${POSTS_DIR}`,
  });
  const posts: PostSummary[] = [];
  for (const folder of data.repository?.object?.entries ?? []) {
    const text = folder.object?.entries?.find((entry) => isPostFile(folder.name, entry.name))?.object?.text;
    if (typeof text !== 'string') continue;
    const fields = frontmatterFields(text);
    posts.push({
      slug: folder.name,
      title: fields.get('title') || folder.name,
      date: fields.get('date') ?? '',
      draft: fields.get('draft') === 'true',
    });
  }
  // Newest first, then by slug, descending, as on the site (src/lib/posts.ts).
  return posts.sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug));
}

/** The files of one post folder, with their text. */
const FOLDER_QUERY = `query ($owner: String!, $repo: String!, $expression: String!) {
  repository(owner: $owner, name: $repo) {
    object(expression: $expression) {
      ... on Tree {
        entries {
          name
          oid
          object {
            ... on Blob {
              text
              isTruncated
            }
          }
        }
      }
    }
  }
}`;

/** The post `slug`, or null when the branch has none. */
export async function loadPost(config: Config, slug: string): Promise<Post | null> {
  const data = await graphql<{ repository: { object: Tree<Blob> | null } | null }>(config, FOLDER_QUERY, {
    expression: `${config.branch}:${POSTS_DIR}/${slug}`,
  });
  const entries = data.repository?.object?.entries ?? [];
  const post = entries.find((entry) => isPostFile(slug, entry.name));
  if (!post) return null;
  const text = post.object?.text;
  if (typeof text !== 'string' || post.object?.isTruncated) {
    throw new GitHubError(`${post.name} をテキストとして読み込めません`, 502);
  }
  return {
    slug,
    file: post.name,
    text,
    sha: post.oid,
    files: entries.filter((entry) => entry !== post).map((entry) => entry.name),
  };
}

/** The branch's last commit, its tree and the files of one post folder (null when there is none). */
const HEAD_QUERY = `query ($owner: String!, $repo: String!, $ref: String!, $folder: String!) {
  repository(owner: $owner, name: $repo) {
    ref(qualifiedName: $ref) {
      target {
        oid
        ... on Commit {
          tree {
            oid
          }
          file(path: $folder) {
            object {
              ... on Tree {
                entries {
                  name
                  oid
                }
              }
            }
          }
        }
      }
    }
  }
}`;

interface HeadData {
  repository: {
    ref: {
      target: {
        oid: string;
        tree?: { oid: string };
        file?: { object?: { entries?: { name: string; oid: string }[] } | null } | null;
      };
    } | null;
  } | null;
}

/**
 * Commits the post and its new images to the branch, as one commit on top of the branch's last
 * commit. Refuses, without changing anything, when GitHub's post is no longer `base` (it changed
 * after the editor opened it), when a new post's slug is taken, or when an image's name is taken by
 * another file. When the branch moves between reading it and updating it, reads it again.
 */
export async function savePost(config: Config, slug: string, request: SaveRequest): Promise<SaveResult | SaveConflict> {
  const folder = `${POSTS_DIR}/${slug}`;
  const blob = await rest<{ sha: string }>(config, 'POST', '/git/blobs', { content: request.text, encoding: 'utf-8' });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const data = await graphql<HeadData>(config, HEAD_QUERY, { ref: `refs/heads/${config.branch}`, folder });
    const head = data.repository?.ref?.target;
    if (!head?.tree) throw new GitHubError(`ブランチ ${config.branch} が見つかりません`, 502);
    const entries = head.file?.object?.entries ?? [];
    const post = entries.find((entry) => isPostFile(slug, entry.name));

    if (request.base === null && post) {
      return { conflict: `${slug} という slug の記事が GitHub にすでにあります。` };
    }
    if (request.base !== null && !post) {
      return { conflict: 'この記事は GitHub で削除されています。' };
    }
    if (request.base !== null && post && post.oid !== request.base) {
      return { conflict: 'この記事を開いたあとで、GitHub の記事が変更されています。' };
    }
    for (const image of request.images) {
      const existing = entries.find((entry) => entry.name === image.name);
      if (existing && existing.oid !== image.sha) {
        return { conflict: `${image.name} という名前のファイルが GitHub にすでにあります。` };
      }
    }

    const unchanged =
      post?.oid === blob.sha && request.images.every((image) => entries.some((entry) => entry.name === image.name));
    if (unchanged) return { sha: blob.sha, commit: head.oid, commitUrl: commitUrl(config, head.oid) };

    const tree = await rest<{ sha: string }>(config, 'POST', '/git/trees', {
      base_tree: head.tree.oid,
      tree: [
        { path: `${folder}/${post?.name ?? `${slug}.md`}`, mode: '100644', type: 'blob', sha: blob.sha },
        ...request.images.map((image) => ({
          path: `${folder}/${image.name}`,
          mode: '100644',
          type: 'blob',
          sha: image.sha,
        })),
      ],
    });
    const commit = await rest<{ sha: string }>(config, 'POST', '/git/commits', {
      message: `content: ${post ? 'update' : 'add'} ${slug}`,
      tree: tree.sha,
      parents: [head.oid],
    });
    try {
      await rest(config, 'PATCH', `/git/refs/heads/${config.branch}`, { sha: commit.sha, force: false });
    } catch (error) {
      // 422: the branch moved after it was read, so this commit is not a fast-forward.
      if (error instanceof GitHubError && error.status === 422) continue;
      throw error;
    }
    return { sha: blob.sha, commit: commit.sha, commitUrl: commitUrl(config, commit.sha) };
  }
  throw new GitHubError('ほかの変更と重なって保存できませんでした。もう一度保存してください。', 503);
}
