/**
 * The editor page, /admin/edit/?slug=<slug>. It opens the post from GitHub (or the template, for a
 * new post), keeps work not saved yet in this browser (drafts.ts), and saves the post with the
 * images added to it as one commit through the API (functions/admin/api/).
 */
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { slugProblem } from '../lib/post-path.ts';
import { newPostText, todayInJapan } from '../lib/post-template.ts';
import { SITE } from '../site.ts';
import * as api from './api.ts';
import * as drafts from './drafts.ts';
import { imageFiles, prepareImage, toBase64 } from './images.ts';
import { articleTheme, folderFileName, folderImages, livePreview, markdownSupport } from './live-preview.ts';
import { element, messageOf, showNotice } from './notice.ts';

const slug = new URLSearchParams(location.search).get('slug') ?? '';

const fileName = element('file-name');
const status = element('status');
const imageInput = element<HTMLInputElement>('image-input');
const saveButton = element<HTMLButtonElement>('save');
const notices = element('notices');
const editorParent = element('editor');

/** SHA of GitHub's text that the next save replaces; null while the post is not on GitHub. */
let base: string | null = null;
/** GitHub's text at `base`; null while the post is not on GitHub. */
let savedText: string | null = null;
/** Set when GitHub's post changed after this browser's draft began; saving is then refused. */
let conflict = false;
let saving = false;
/** Files in the post's folder on GitHub. */
const folderFiles = new Set<string>();
/** Images added in this browser and not saved yet, by file name. */
const pendingImages = new Map<string, Blob>();
/** Images added in this browser, shown from memory (also after they are saved). */
const objectUrls = new Map<string, string>();

let view: EditorView | undefined;
let draftTimer: number | undefined;

const imageSource = (url: string) => {
  const name = folderFileName(url);
  if (name === undefined) return url;
  return objectUrls.get(name) ?? api.imageUrl(slug, name);
};

/** Added images that the post shows, which the next save uploads. */
function imagesToUpload(state: EditorState): string[] {
  if (pendingImages.size === 0) return [];
  return folderImages(state).filter((name) => pendingImages.has(name));
}

function isDirty(state: EditorState): boolean {
  return savedText === null || state.doc.toString() !== savedText || imagesToUpload(state).length > 0;
}

function updateStatus(): void {
  const dirty = view ? isDirty(view.state) : false;
  saveButton.disabled = !view || saving || conflict || !dirty;
  status.textContent = !view ? '' : saving ? '保存中…' : conflict ? '保存できません' : dirty ? '未保存' : '保存済み';
}

/** Keeps the text in this browser, or forgets it once it matches GitHub's. */
function storeDraft(): void {
  if (!view) return;
  if (!isDirty(view.state)) {
    drafts.removeDraft(slug);
    return;
  }
  if (!drafts.writeDraft(slug, { text: view.state.doc.toString(), base })) {
    showNotice(notices, 'warn', 'このブラウザに下書きを残せません。保存せずにタブを閉じると、変更は失われます。');
  }
}

function onChange(): void {
  updateStatus();
  window.clearTimeout(draftTimer);
  draftTimer = window.setTimeout(storeDraft, 300);
}

/** Stops saving, so that the change made on GitHub is not overwritten, and offers to start over. */
function showConflict(message: string): void {
  conflict = true;
  const discard = document.createElement('button');
  discard.type = 'button';
  discard.className = 'admin-button';
  discard.textContent = 'この端末の変更を捨てて開き直す';
  discard.addEventListener('click', async () => {
    window.clearTimeout(draftTimer);
    drafts.removeDraft(slug);
    await Promise.all([...pendingImages.keys()].map((name) => drafts.removeImage(slug, name).catch(() => {})));
    location.reload();
  });
  showNotice(notices, 'warn', `${message}上書きしないよう、保存を止めています。`, document.createElement('br'), discard);
  updateStatus();
}

/**
 * Puts the images on their own lines after the cursor's line, as figures, with the cursor in the
 * first image's alternative text.
 */
function insertImages(names: string[]): void {
  if (!view) return;
  const { doc, selection } = view.state;
  const line = doc.lineAt(selection.main.head);
  const empty = line.text.trim() === '';
  const previous = line.number > 1 ? doc.line(line.number - 1).text.trim() : '';
  const next = line.number < doc.lines ? doc.line(line.number + 1).text.trim() : '';
  const before = empty ? (previous ? '\n' : '') : '\n\n';
  const after = next ? '\n' : '';
  const from = empty ? line.from : line.to;
  view.dispatch({
    changes: { from, to: line.to, insert: before + names.map((name) => `![](./${name})`).join('\n\n') + after },
    selection: { anchor: from + before.length + 2 },
    scrollIntoView: true,
  });
  view.focus();
}

async function addImages(files: File[]): Promise<void> {
  if (!view || files.length === 0) return;
  imageInput.disabled = true;
  status.textContent = '画像を変換中…';
  const added: string[] = [];
  try {
    for (const file of files) {
      const image = await prepareImage(file, (name) => folderFiles.has(name) || pendingImages.has(name));
      pendingImages.set(image.name, image.blob);
      objectUrls.set(image.name, URL.createObjectURL(image.blob));
      added.push(image.name);
      await drafts.writeImage(slug, image.name, image.blob).catch(() => {
        showNotice(notices, 'warn', '画像をこのブラウザに残せません。保存せずにタブを閉じると、画像は失われます。');
      });
    }
  } catch (error) {
    showNotice(notices, 'alert', messageOf(error));
  } finally {
    imageInput.disabled = false;
    if (added.length > 0) insertImages(added);
    updateStatus();
  }
}

async function save(): Promise<void> {
  if (!view || saving || conflict) return;
  const { state } = view;
  if (!isDirty(state)) return;
  const text = state.doc.toString();
  const shown = folderImages(state);
  const missing = shown.filter((name) => !folderFiles.has(name) && !pendingImages.has(name));
  if (missing.length > 0) {
    showNotice(notices, 'alert', `記事のフォルダーにない画像を使っています: ${missing.join(', ')}`);
    return;
  }

  const added = [...pendingImages.keys()];
  saving = true;
  updateStatus();
  try {
    const images: { name: string; sha: string }[] = [];
    for (const name of shown) {
      const blob = pendingImages.get(name);
      if (blob) images.push({ name, sha: await api.uploadImage(await toBase64(blob)) });
    }
    const result = await api.savePost(slug, { text, base, images });
    base = result.sha;
    savedText = text;
    // The uploaded images are in the folder now. Images added before the save that the post no
    // longer shows are dropped; those added during the save stay for the next one.
    for (const { name } of images) folderFiles.add(name);
    for (const name of added) {
      pendingImages.delete(name);
      void drafts.removeImage(slug, name).catch(() => {});
    }
    const commit = document.createElement('a');
    commit.href = result.commitUrl;
    commit.target = '_blank';
    commit.rel = 'noopener';
    commit.textContent = result.commit.slice(0, 7);
    showNotice(notices, 'tip', '保存しました。数分でサイトに反映されます（コミット ', commit, '）。');
  } catch (error) {
    if (error instanceof api.ApiError && error.status === 409) showConflict(error.message);
    else showNotice(notices, 'alert', `保存できませんでした: ${messageOf(error)}`);
  } finally {
    saving = false;
    // Keeps what was typed during the save, against the new base.
    storeDraft();
    updateStatus();
  }
}

function createEditor(text: string): EditorView {
  return new EditorView({
    parent: editorParent,
    state: EditorState.create({
      doc: text,
      extensions: [
        history(),
        keymap.of([
          {
            key: 'Mod-s',
            preventDefault: true,
            run: () => {
              void save();
              return true;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        markdownSupport(),
        livePreview(imageSource),
        articleTheme,
        EditorView.lineWrapping,
        // The site header is fixed at the top of the page.
        EditorView.scrollMargins.of(() => ({ top: 72, bottom: 24 })),
        EditorView.contentAttributes.of({ 'aria-label': '記事の Markdown' }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange();
        }),
        EditorView.domEventHandlers({
          paste: (event) => {
            const files = imageFiles(event.clipboardData);
            if (files.length === 0) return false;
            event.preventDefault();
            void addImages(files);
            return true;
          },
          drop: (event, target) => {
            const files = imageFiles(event.dataTransfer);
            if (files.length === 0) return false;
            event.preventDefault();
            const position = target.posAtCoords({ x: event.clientX, y: event.clientY });
            if (position !== null) target.dispatch({ selection: { anchor: position } });
            void addImages(files);
            return true;
          },
        }),
      ],
    }),
  });
}

async function open(): Promise<void> {
  const problem = slugProblem(slug);
  if (problem) {
    showNotice(notices, 'alert', problem);
    return;
  }
  document.title = `${slug} | 編集 | ${SITE.title}`;
  fileName.textContent = slug;
  status.textContent = '読み込み中…';

  let post: api.Post | null;
  try {
    post = await api.loadPost(slug);
  } catch (error) {
    status.textContent = '';
    showNotice(notices, 'alert', messageOf(error));
    return;
  }
  base = post?.sha ?? null;
  savedText = post?.text ?? null;
  for (const name of post?.files ?? []) folderFiles.add(name);
  fileName.textContent = post?.file ?? `${slug}.md`;

  const images = await drafts.readImages(slug).catch(() => new Map<string, Blob>());
  for (const [name, blob] of images) {
    pendingImages.set(name, blob);
    objectUrls.set(name, URL.createObjectURL(blob));
  }

  const draft = drafts.readDraft(slug);
  let text = post?.text ?? newPostText(todayInJapan());
  if (draft) {
    text = draft.text;
    if (draft.base !== base) {
      base = draft.base;
      view = createEditor(text);
      showConflict(
        post === null
          ? 'この記事は、この端末で編集を始めたあとで GitHub から削除されています。'
          : draft.base === null
            ? '同じ slug の記事が GitHub にあります。'
            : 'この端末で編集を始めたあとで、GitHub の記事が変更されています。',
      );
      return;
    }
    if (draft.text !== savedText || images.size > 0) {
      showNotice(notices, 'info', 'この端末に残っていた、保存していない変更を開きました。');
    }
  }
  view = createEditor(text);
  updateStatus();
}

imageInput.addEventListener('change', () => {
  const files = [...(imageInput.files ?? [])];
  imageInput.value = '';
  void addImages(files);
});
saveButton.addEventListener('click', () => void save());
// Keeps the last keystrokes when the tab is closed or put in the background.
window.addEventListener('pagehide', storeDraft);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') storeDraft();
});

void open();
