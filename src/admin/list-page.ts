/**
 * The editor's list page, /admin/: the posts on GitHub and the new posts started in this browser,
 * each linking to the editor, and the form that starts a new post.
 */
import { frontmatterFields } from '../lib/frontmatter.ts';
import { slugProblem } from '../lib/post-path.ts';
import * as api from './api.ts';
import * as drafts from './drafts.ts';
import { element, messageOf, showNotice } from './notice.ts';

const form = element<HTMLFormElement>('new-post');
const slugInput = element<HTMLInputElement>('new-slug');
const formError = element('new-error');
const notices = element('notices');
const rows = element('posts');

const editUrl = (slug: string) => `/admin/edit/?slug=${encodeURIComponent(slug)}`;

/** Slugs of the posts on GitHub, once the list has loaded. */
let known: Set<string> | undefined;

interface Row {
  slug: string;
  title: string;
  date: string;
  draft: boolean;
  /** Whether this browser has changes to the post that are not on GitHub. */
  local: boolean;
}

function cell(text: string, className: string): HTMLTableCellElement {
  const td = document.createElement('td');
  td.className = className;
  td.textContent = text;
  return td;
}

function render(posts: api.PostSummary[]): void {
  const local = new Set(drafts.draftSlugs());
  known = new Set(posts.map((post) => post.slug));
  const list: Row[] = posts.map((post) => ({ ...post, local: local.has(post.slug) }));
  // New posts that exist only as a draft in this browser come first.
  const started = [...local].filter((slug) => !known?.has(slug));
  const fresh = started.map((slug): Row => {
    const fields = frontmatterFields(drafts.readDraft(slug)?.text ?? '');
    return { slug, title: fields.get('title') || slug, date: fields.get('date') ?? '', draft: true, local: true };
  });

  rows.replaceChildren(
    ...[...fresh, ...list].map((row) => {
      const tr = document.createElement('tr');
      const title = document.createElement('td');
      title.className = 'title';
      const anchor = document.createElement('a');
      anchor.href = editUrl(row.slug);
      anchor.textContent = row.title;
      title.append(anchor);
      tr.append(
        title,
        cell(row.slug, 'slug'),
        cell(row.date, 'date'),
        cell(row.draft ? '下書き' : '公開', row.draft ? 'state draft' : 'state'),
        cell(row.local ? '未保存' : '', 'local'),
      );
      return tr;
    }),
  );
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const slug = slugInput.value.trim();
  const problem = slugProblem(slug) ?? (known?.has(slug) ? `${slug} という slug の記事はすでにあります` : undefined);
  formError.textContent = problem ?? '';
  formError.hidden = !problem;
  if (!problem) location.href = editUrl(slug);
});

api.listPosts().then(render, (error: unknown) => showNotice(notices, 'alert', messageOf(error)));
