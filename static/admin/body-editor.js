/**
 * `body-editor` field type: the article body as plain Markdown, with quick insertion of the blog's
 * special notations (Zola shortcodes) that the preview pane renders.
 *
 * - The toolbar and a palette (⌘/ on macOS, Ctrl+/ elsewhere) insert a notation at the caret. The
 *   selected text, if any, becomes its content, e.g. the quote of a ref.
 * - A notation is inserted with example values in its fields, and the first one to fill in is
 *   selected, so typing replaces it. Tab / Shift+Tab move between the fields (url, title, body…),
 *   Enter does the same in one-line fields, and the status line names the current field.
 * - Tab after the last field, Escape, or moving the caret out of the notation finishes it: optional
 *   fields that still hold their example, or are empty, are dropped (see `finishSnippetText`).
 * - Once the URL of a link card or a ref is in, the title (and description) of the linked page are
 *   fetched through /api/admin/link-meta and put into the fields that still hold their example,
 *   even when the notation was finished in the meantime.
 * - Images that are pasted, dropped or chosen with the 画像 button are handed to the CMS with
 *   `addFile`, saved next to index.md with the entry, and inserted as `{{ img(...) }}`.
 *
 * The textarea is uncontrolled: typing never waits for a round trip through the CMS store, which
 * keeps the caret, undo history and IME composition intact. A value that comes from outside
 * (revert, restored draft) is written back only when it differs from what the editor reported.
 */
import { IMAGE_SNIPPET, SNIPPETS, buildSnippet, finishSnippetText, surroundings, syntaxOf } from './snippets.js';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
/** The key for /api/admin, saved by the hero image field (hero-field.js). */
const ADMIN_KEY_STORAGE = 'blog-admin-api-key';
/** Fields filled from the linked page, per notation. */
const AUTO_FILL = { link: ['title', 'desc'], ref: ['title'] };
const FIELD_NAMES = { title: 'タイトル', desc: '説明' };
const WEB_URL = /^https?:\/\/[^\s"<>]+$/i;
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const PALETTE_KEY = IS_MAC ? '⌘/' : 'Ctrl+/';

/** Replace the textarea's selection with `text` so that the browser's undo history keeps it. */
function insertText(textarea, text) {
  textarea.focus({ preventScroll: true });

  // execCommand is deprecated but still the only way to edit a textarea undoably.
  if (!document.execCommand('insertText', false, text)) {
    const { selectionStart, selectionEnd } = textarea;

    textarea.setRangeText(text, selectionStart, selectionEnd, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/**
 * Remember the scroll position of the node's ancestors; the returned function puts them back.
 * Editing the textarea can scroll them: the browser reveals the caret after an edit, and clamps
 * the scroll position while the textarea is collapsed for measuring.
 */
function keepScroll(node) {
  const saved = [];

  for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
    saved.push([ancestor, ancestor.scrollTop]);
  }

  return () =>
    saved.forEach(([ancestor, top]) => {
      if (ancestor.scrollTop !== top) ancestor.scrollTop = top;
    });
}

/** Answers of /api/admin/link-meta by URL: `{ title, description }` or `{ error }`. */
const linkMetaRequests = new Map();

function fetchLinkMeta(url) {
  if (linkMetaRequests.has(url)) return linkMetaRequests.get(url);

  let key = '';

  try {
    key = localStorage.getItem(ADMIN_KEY_STORAGE) || '';
  } catch {
    // Storage blocked: same as no key.
  }

  const request = key
    ? fetch(`/api/admin/link-meta?url=${encodeURIComponent(url)}`, { headers: { Authorization: `Bearer ${key}` } })
        .then(async (response) => (response.ok ? response.json() : { error: response.status }))
        .catch(() => ({ error: 'network' }))
    : Promise.resolve({ error: 'no-key' });

  linkMetaRequests.set(url, request);
  // Keep answers only: a lookup that failed may work next time.
  request.then((meta) => {
    if (meta.error) linkMetaRequests.delete(url);
  });

  return request;
}

/** Text for a shortcode string: one line without `"`, as Zola strings have no escapes. */
function argText(text) {
  let quotes = 0;

  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/"/g, () => (quotes++ % 2 ? '”' : '“'));
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Element → handler that returns true when it consumed an Escape key press. */
const escapeHandlers = new WeakMap();

/*
 * Sveltia binds its keyboard shortcuts on `window` in the capture phase, and Escape clicks the
 * entry editor's close button. This listener is added when the module is imported, i.e. before
 * `CMS.init()`, so it runs first. It keeps Escape for the body editor while a notation or the
 * palette is open, and while an IME is composing, where Escape only cancels the conversion.
 */
window.addEventListener(
  'keydown',
  (event) => {
    const handler = escapeHandlers.get(event.target);

    if (!handler || (event.key !== 'Escape' && event.code !== 'Escape')) return;

    if (event.isComposing || event.keyCode === 229) {
      event.stopImmediatePropagation();

      return;
    }

    if (handler()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true,
);

const matches = (snippet, query) => {
  const q = query.trim().toLowerCase();

  return !q || `${snippet.label} ${snippet.keywords} ${snippet.id}`.toLowerCase().includes(q);
};

const BodyEditorControl = createClass({
  getInitialState: function () {
    return {
      paletteOpen: false,
      query: '',
      active: 0,
      sessionActive: false,
      field: null,
      busy: false,
      message: '',
      error: false,
      notice: '',
    };
  },

  componentWillUnmount: function () {
    clearTimeout(this.noticeTimer);
  },

  componentDidMount: function () {
    const textarea = this.textarea;
    const value = this.props.value ?? '';

    // Values this editor has reported; the CMS echoes them back through `value`, possibly late.
    this.emitted = new Set([value]);
    this.previous = value;
    textarea.value = value;
    this.resize();
    escapeHandlers.set(textarea, () => {
      if (!this.session) return false;

      this.finishSession(true);

      return true;
    });
  },

  componentDidUpdate: function (prevProps) {
    const value = this.props.value ?? '';
    const textarea = this.textarea;

    // Only a new value from outside (revert, restored draft) replaces the text. Re-renders caused
    // by this component's own state, and echoes of what it reported, must not touch the textarea.
    if (!textarea || value === (prevProps.value ?? '') || this.emitted.has(value) || value === textarea.value) {
      return;
    }

    this.endSession();
    textarea.value = value;
    this.emitted = new Set([value]);
    this.previous = value;
    this.resize();
  },

  /**
   * Fit the textarea's height to its content. Measuring needs a collapsed textarea, which makes
   * the page shorter for a moment, so the edit pane's scroll position is kept, or the view would
   * jump up whenever a long body is edited below the first screen.
   */
  resize: function () {
    const textarea = this.textarea;

    if (!textarea) return;

    const restoreScroll = keepScroll(textarea);

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
    restoreScroll();
  },

  onInput: function () {
    const value = this.textarea.value;

    if (this.session) this.trackEdit(this.previous, value);

    this.previous = value;
    this.emitted.add(value);

    if (this.emitted.size > 200) this.emitted.delete(this.emitted.values().next().value);

    this.props.onChange(value);
    this.resize();
  },

  /* ------------------------------------------------------------ notation fields (Tab stops) */

  /** Keep the open notation's field ranges in step with an edit, or close it if the edit is elsewhere. */
  trackEdit: function (before, after) {
    const session = this.session;
    const delta = after.length - before.length;
    const caret = this.textarea.selectionStart;
    let prefix = 0;

    while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;

    // Typing, pasting and IME composition all end at the caret.
    const oldEnd = caret - delta;
    const oldStart = Math.min(prefix, oldEnd);
    // Usually the current field, but a field can also be clicked and typed into.
    const index = session.fields.findIndex((f) => oldStart >= f.start && oldEnd <= f.end);

    if (index < 0) {
      this.endSession();

      return;
    }

    const field = session.fields[index];

    field.end += delta;
    field.touched = true;
    session.fields.slice(index + 1).forEach((f) => {
      f.start += delta;
      f.end += delta;
    });
    session.end += delta;
    session.exit += delta;

    if (index !== session.index) this.setField(index);
  },

  fieldAtCaret: function () {
    const session = this.session;
    const caret = this.textarea.selectionStart;
    const current = session.fields[session.index];

    if (current && caret >= current.start && caret <= current.end) return session.index;

    return session.fields.findIndex((f) => caret >= f.start && caret <= f.end);
  },

  /** Make a field the current one, which the status line names. */
  setField: function (index) {
    const { label, hint } = this.session.fields[index];

    this.session.index = index;
    this.setState({ field: { label, hint } });
  },

  /** Select a field's text, e.g. its example value, so that typing replaces it. */
  selectField: function (index) {
    const field = this.session.fields[index];

    if (index !== this.session.index && this.session.fields[this.session.index]?.name === 'url') {
      this.requestLinkMeta(this.session);
    }

    this.setField(index);
    this.textarea.setSelectionRange(field.start, field.end);
  },

  /**
   * After a click or a key press in the textarea: follow the caret to another field of the open
   * notation, or finish the notation when the caret has left it, keeping the caret where it is.
   */
  onCaretMove: function (event) {
    const session = this.session;

    if (!session || event.nativeEvent?.isComposing || event.keyCode === 229) return;

    const { selectionStart, selectionEnd } = this.textarea;

    if (selectionStart <= session.start || selectionEnd >= session.end) {
      this.finishSession(true, true);

      return;
    }

    const index = this.fieldAtCaret();

    if (index >= 0 && index !== session.index) {
      if (session.fields[session.index]?.name === 'url') this.requestLinkMeta(session);

      this.setField(index);
    }
  },

  endSession: function () {
    if (!this.session) return;

    this.session = null;
    this.setState({ sessionActive: false, field: null });
  },

  /**
   * Close the open notation. With `cleanup`, drop the examples left in optional fields and empty
   * optional arguments. The caret then moves past the notation, or with `keepSelection` stays
   * where the user put it.
   */
  finishSession: function (cleanup, keepSelection = false) {
    const session = this.session;
    const textarea = this.textarea;

    if (!session) return;

    // The lookup fills the finished text later if the fields to fill are dropped now.
    if (cleanup) this.requestLinkMeta(session);

    this.endSession();

    const selection = [textarea.selectionStart, textarea.selectionEnd];
    let delta = 0;

    if (cleanup) {
      const original = textarea.value.slice(session.start, session.end);
      const fields = session.fields.map((f) => ({ ...f, start: f.start - session.start, end: f.end - session.start }));
      const cleaned = finishSnippetText(session.snippet, original, fields);

      if (cleaned !== original) {
        const restoreScroll = keepScroll(textarea);

        textarea.setSelectionRange(session.start, session.end);
        insertText(textarea, cleaned);
        restoreScroll();
        delta = cleaned.length - original.length;
      }
    }

    // Positions after the notation move with the cleanup; positions inside it stay inside.
    const move = (position) => (position >= session.end ? position + delta : Math.min(position, session.end + delta));
    const [from, to] = keepSelection ? selection.map(move) : [session.exit + delta, session.exit + delta];

    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(from, to);
  },

  onKeyDown: function (event) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;

    if ((IS_MAC ? event.metaKey : event.ctrlKey) && (event.key === '/' || event.code === 'Slash')) {
      event.preventDefault();
      this.openPalette();

      return;
    }

    if (!this.session) return;

    const forward = event.key === 'Tab' ? !event.shiftKey : event.key === 'Enter' && !event.shiftKey;

    if (event.key !== 'Tab' && !(event.key === 'Enter' && !event.shiftKey)) return;

    const index = this.fieldAtCaret();

    if (index < 0) {
      this.endSession();

      return;
    }

    // Enter only moves on from one-line fields; in the body of a notation it is a newline.
    if (event.key === 'Enter' && this.session.fields[index].multiline) return;

    event.preventDefault();

    if (!forward) {
      this.selectField(Math.max(0, index - 1));
    } else if (index < this.session.fields.length - 1) {
      this.selectField(index + 1);
    } else {
      this.finishSession(true);
    }
  },

  /* ------------------------------------------------------------ title and description from the linked page */

  /** Once the URL of a link card or a ref is in, look up the linked page (once per URL). */
  requestLinkMeta: function (session) {
    const names = AUTO_FILL[session.snippet.id];
    const urlField = session.fields.find((f) => f.name === 'url');

    if (!names || !urlField) return;

    const url = this.textarea.value.slice(urlField.start, urlField.end).trim();

    if (!WEB_URL.test(url) || url === urlField.sample || session.metaRequested === url) return;
    if (!session.fields.some((f) => names.includes(f.name) && !f.touched)) return;

    session.metaRequested = url;
    this.setNotice('リンク先のタイトルを取得しています…', true);
    fetchLinkMeta(url).then((meta) => this.applyLinkMeta(session, url, meta));
  },

  applyLinkMeta: function (session, url, meta) {
    if (!this.textarea) return;

    if (this.composing) {
      // Changing the text now would break the conversion in progress.
      this.afterComposition = () => this.applyLinkMeta(session, url, meta);

      return;
    }

    if (meta.error) {
      this.setNotice(
        meta.error === 'no-key' || meta.error === 401
          ? 'タイトルの自動入力には管理 API キーが要ります (ヒーロー画像の欄で保存)'
          : 'リンク先のタイトルを取得できませんでした',
      );

      return;
    }

    const values = { title: argText(meta.title), desc: argText(meta.description) };
    const names = AUTO_FILL[session.snippet.id].filter((name) => values[name]);
    const filled =
      this.session === session
        ? this.fillFields(session, url, names, values)
        : this.fillFinished(session.snippet, url, names, values);

    this.setNotice(filled.length ? `リンク先の${filled.map((name) => FIELD_NAMES[name]).join('と')}を入れました` : '');
  },

  /** Fill the open notation's fields that still hold their example (or are empty). */
  fillFields: function (session, url, names, values) {
    const urlField = session.fields.find((f) => f.name === 'url');

    // The URL changed while the page was being read.
    if (this.textarea.value.slice(urlField.start, urlField.end).trim() !== url) return [];

    const filled = [];

    for (const name of names) {
      const field = session.fields.find((f) => f.name === name);

      if (!field || field.touched || this.session !== session) continue;

      this.replaceField(field, values[name]);
      filled.push(name);
    }

    return filled;
  },

  /** Replace a field's text, keeping the current field and the user's selection. */
  replaceField: function (field, text) {
    const textarea = this.textarea;
    const session = this.session;
    const index = session.index;
    const [from, to] = [textarea.selectionStart, textarea.selectionEnd];
    const selected = from === field.start && to === field.end;
    const oldEnd = field.end;

    // trackEdit (through the input event) moves the later fields and marks this one as edited.
    this.replaceRange(field.start, field.end, text);

    if (this.session !== session) return;

    const delta = field.end - oldEnd;

    if (session.index !== index) this.setField(index);

    if (selected) textarea.setSelectionRange(field.start, field.end);
    else textarea.setSelectionRange(from >= oldEnd ? from + delta : from, to >= oldEnd ? to + delta : to);
  },

  /**
   * Fill a notation that was finished before the answer came: its text must be found once, with
   * the URL, and lack the argument or still have the example.
   */
  fillFinished: function (snippet, url, names, values) {
    const textarea = this.textarea;
    const [open, close] = snippet.id === 'link' ? ['\\{\\{\\s*link\\(', '\\)\\s*\\}\\}'] : ['\\{%\\s*ref\\(', '\\)\\s*%\\}'];
    const pattern = new RegExp(`${open}(\\s*url="${escapeRegExp(url)}"(?:\\s*,\\s*\\w+="[^"]*")*\\s*)${close}`, 'g');
    const matches = [...textarea.value.matchAll(pattern)];

    if (matches.length !== 1) return [];

    const [match] = matches;
    const args = {};

    for (const arg of match[1].matchAll(/(\w+)="([^"]*)"/g)) args[arg[1]] = arg[2];

    const filled = names.filter((name) => !args[name] || args[name] === snippet.samples?.[name]);

    if (!filled.length) return [];

    filled.forEach((name) => {
      args[name] = values[name];
    });

    const order = [...new Set(['url', ...AUTO_FILL[snippet.id], ...Object.keys(args)])];
    const inner = order.filter((key) => args[key] !== undefined).map((key) => `${key}="${args[key]}"`).join(', ');
    const text = snippet.id === 'link' ? `{{ link(${inner}) }}` : `{% ref(${inner}) %}`;
    const start = match.index;
    const end = start + match[0].length;
    const delta = text.length - match[0].length;
    const [from, to] = [textarea.selectionStart, textarea.selectionEnd];
    const move = (position) => (position >= end ? position + delta : Math.min(position, start + text.length));

    this.replaceRange(start, end, text);
    textarea.setSelectionRange(move(from), move(to));

    return filled;
  },

  /** Replace a range of the text: undoably while the textarea has the focus, else without taking it. */
  replaceRange: function (start, end, text) {
    const textarea = this.textarea;
    const restoreScroll = keepScroll(textarea);

    if (document.activeElement === textarea) {
      textarea.setSelectionRange(start, end);
      insertText(textarea, text);
    } else {
      textarea.setRangeText(text, start, end, 'end');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    restoreScroll();
  },

  /** A short note after the status line; `sticky` keeps it until the next one. */
  setNotice: function (text, sticky = false) {
    clearTimeout(this.noticeTimer);
    this.setState({ notice: text });

    if (text && !sticky) this.noticeTimer = setTimeout(() => this.setState({ notice: '' }), 6000);
  },

  /* ------------------------------------------------------------ insertion */

  insertSnippet: function (snippet, values = {}) {
    const textarea = this.textarea;
    const [start, end] = this.savedSelection ?? [textarea.selectionStart, textarea.selectionEnd];

    this.savedSelection = null;
    this.endSession();

    if (snippet.action === 'image') {
      this.imageSelection = [start, end];
      this.fileInput.click();

      return;
    }

    const value = textarea.value;
    const selected = value.slice(start, end);
    const prefilled = { ...values };

    if (selected && snippet.wrap && prefilled[snippet.wrap] === undefined) prefilled[snippet.wrap] = selected;

    const { text, fields } = buildSnippet(snippet, prefilled);
    const after = value.slice(end);
    const { prefix, suffix } = surroundings(value.slice(0, start), after, snippet.inline);
    const base = start + prefix.length;

    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(start, end);
    insertText(textarea, prefix + text + suffix);

    const exit = after === '' ? base + text.length + suffix.length : base + text.length;

    if (!fields.length) {
      textarea.setSelectionRange(exit, exit);

      return;
    }

    this.session = {
      snippet,
      fields: fields.map((f) => ({ ...f, start: base + f.start, end: base + f.end })),
      index: 0,
      start: base,
      end: base + text.length,
      exit,
    };
    this.setState({ sessionActive: true, message: '', error: false });

    // Start at the first field that holds an example rather than the selected text.
    const first = this.session.fields.findIndex((f) => f.sample !== null);

    this.selectField(first >= 0 ? first : 0);
  },

  insertImages: async function (files) {
    const images = files.filter((file) => IMAGE_TYPES.includes(file.type));

    if (!images.length) {
      this.setState({ message: '対応している画像は png / jpg / gif / webp です', error: true });

      return;
    }

    this.setState({ busy: true, message: '画像を追加しています…', error: false });

    const urls = [];

    for (const file of images) {
      try {
        const extension = file.type.split('/')[1].replace('jpeg', 'jpg');

        urls.push(await this.props.addFile(file, { name: file.name || `image.${extension}` }));
      } catch (error) {
        this.setState({ message: `${file.name}: ${error.message}`, error: true });
      }
    }

    this.setState({ busy: false });

    if (!urls.length) return;

    this.setState({ message: '画像は記事と一緒に保存されます', error: false });

    if (urls.length === 1) {
      this.insertSnippet(IMAGE_SNIPPET, { src: urls[0] });
    } else {
      this.insertSnippet({ id: 'images', template: urls.map((url) => `{{ img(src="${url}") }}`).join('\n\n') });
    }
  },

  onPaste: function (event) {
    const files = [...(event.clipboardData?.files ?? [])];

    if (files.some((file) => file.type.startsWith('image/'))) {
      event.preventDefault();
      this.insertImages(files);
    }
  },

  onDragOver: function (event) {
    if ([...(event.dataTransfer?.types ?? [])].includes('Files')) {
      event.preventDefault();
      this.textarea.classList.add('be-drop');
    }
  },

  onDragLeave: function () {
    this.textarea.classList.remove('be-drop');
  },

  onDrop: function (event) {
    this.textarea.classList.remove('be-drop');

    const files = [...(event.dataTransfer?.files ?? [])];

    if (files.length) {
      event.preventDefault();
      this.insertImages(files);
    }
  },

  onFilesChosen: function (event) {
    const files = [...event.target.files];

    event.target.value = '';
    this.savedSelection = this.imageSelection;
    this.imageSelection = null;

    if (files.length) this.insertImages(files);
    else this.savedSelection = null;
  },

  /* ------------------------------------------------------------ palette */

  openPalette: function () {
    const textarea = this.textarea;

    this.savedSelection = [textarea.selectionStart, textarea.selectionEnd];
    this.setState({ paletteOpen: true, query: '', active: 0 }, () => this.paletteInput?.focus({ preventScroll: true }));
  },

  closePalette: function (restoreFocus) {
    const selection = this.savedSelection;

    this.savedSelection = null;
    this.setState({ paletteOpen: false });

    if (restoreFocus && selection) {
      this.textarea.focus({ preventScroll: true });
      this.textarea.setSelectionRange(selection[0], selection[1]);
    }
  },

  choose: function (snippet) {
    this.setState({ paletteOpen: false });
    this.insertSnippet(snippet);
  },

  onPaletteKeyDown: function (event) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;

    const list = SNIPPETS.filter((s) => matches(s, this.state.query));

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      const step = event.key === 'ArrowDown' ? 1 : -1;

      this.setState({ active: list.length ? (this.state.active + step + list.length) % list.length : 0 });
    } else if (event.key === 'Enter') {
      event.preventDefault();

      if (list[this.state.active]) this.choose(list[this.state.active]);
    }
  },

  /* ------------------------------------------------------------ render */

  renderPalette: function () {
    const list = SNIPPETS.filter((s) => matches(s, this.state.query));
    const active = Math.min(this.state.active, Math.max(0, list.length - 1));

    return h(
      'div',
      {
        className: 'be-palette',
        role: 'dialog',
        'aria-label': '記法を挿入',
        ref: (node) => {
          this.paletteRoot = node;
        },
      },
      h('input', {
        className: 'be-palette-input',
        type: 'text',
        value: this.state.query,
        placeholder: '記法を検索 (ref, 注意, code …)',
        'aria-label': '記法を検索',
        ref: (node) => {
          this.paletteInput = node;

          if (node) {
            escapeHandlers.set(node, () => {
              this.closePalette(true);

              return true;
            });
          }
        },
        onChange: (event) => this.setState({ query: event.target.value, active: 0 }),
        onKeyDown: this.onPaletteKeyDown,
        // Close when the focus leaves the palette; clicks on items don't move the focus.
        onBlur: (event) => {
          if (!this.paletteRoot?.contains(event.relatedTarget)) this.closePalette(false);
        },
      }),
      h(
        'ul',
        { className: 'be-palette-list', role: 'listbox' },
        list.length
          ? list.map((snippet, index) =>
              h(
                'li',
                {
                  key: snippet.id,
                  role: 'option',
                  'aria-selected': index === active,
                  className: index === active ? 'be-palette-item be-active' : 'be-palette-item',
                  onMouseDown: (event) => {
                    event.preventDefault();
                    this.choose(snippet);
                  },
                  onMouseEnter: () => this.setState({ active: index }),
                },
                h('span', { className: 'be-palette-label' }, snippet.label),
                h('span', { className: 'be-palette-desc' }, snippet.description),
                h('code', { className: 'be-palette-syntax' }, syntaxOf(snippet)),
              ),
            )
          : h('li', { className: 'be-palette-empty' }, '該当する記法がありません'),
      ),
    );
  },

  render: function () {
    const { forID } = this.props;
    const { paletteOpen, sessionActive, field, busy, message, error, notice } = this.state;
    const keys = '　Tab: 次の欄　Shift+Tab: 前の欄　Esc: 確定';
    const fieldHint = field?.hint ? `（${field.hint}）` : '';
    const status =
      sessionActive && field
        ? [h('strong', { key: 'field', className: 'be-status-field' }, `入力中: ${field.label}`), fieldHint, keys]
        : [message || `記法はボタンか ${PALETTE_KEY} で挿入。画像は貼り付けかドロップでも追加できます`];
    const statusText = status.map((part) => (typeof part === 'string' ? part : `入力中: ${field.label}`)).join('');

    return h(
      'div',
      { className: 'be-root' },
      h(
        'div',
        { className: 'be-toolbar', role: 'toolbar', 'aria-label': '記法を挿入' },
        SNIPPETS.map((snippet) =>
          h(
            'button',
            {
              key: snippet.id,
              type: 'button',
              className: 'be-button',
              title: `${snippet.description}\n${syntaxOf(snippet)}`,
              disabled: busy && snippet.action === 'image',
              // Keep the focus (and selection) in the textarea.
              onMouseDown: (event) => event.preventDefault(),
              onClick: () => this.insertSnippet(snippet),
            },
            snippet.label,
          ),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'be-button be-palette-button',
            title: `記法の一覧 (${PALETTE_KEY})`,
            onMouseDown: (event) => event.preventDefault(),
            onClick: () => (paletteOpen ? this.closePalette(true) : this.openPalette()),
          },
          `一覧 ${PALETTE_KEY}`,
        ),
        paletteOpen ? this.renderPalette() : null,
      ),
      // Two lines of fixed height: text that wraps or appears would push the body down.
      h(
        'div',
        { className: 'be-status', 'aria-live': 'polite' },
        h('div', { className: error ? 'be-status-main be-error' : 'be-status-main', title: statusText }, ...status),
        h('div', { className: 'be-status-notice', title: notice }, notice || '\u00a0'),
      ),
      h('textarea', {
        id: forID,
        className: 'be-textarea',
        spellCheck: false,
        placeholder: 'Markdown で本文を書く',
        ref: (node) => {
          this.textarea = node;
        },
        onInput: this.onInput,
        onKeyDown: this.onKeyDown,
        onKeyUp: this.onCaretMove,
        onMouseUp: this.onCaretMove,
        onCompositionStart: () => {
          this.composing = true;
        },
        onCompositionEnd: () => {
          const pending = this.afterComposition;

          this.composing = false;
          this.afterComposition = null;

          if (pending) setTimeout(pending, 0);
        },
        onPaste: this.onPaste,
        onDragOver: this.onDragOver,
        onDragLeave: this.onDragLeave,
        onDrop: this.onDrop,
      }),
      h('input', {
        type: 'file',
        accept: IMAGE_TYPES.join(','),
        multiple: true,
        hidden: true,
        ref: (node) => {
          this.fileInput = node;
        },
        onChange: this.onFilesChosen,
      }),
    );
  },
});

export function registerBodyEditor() {
  CMS.registerFieldType('body-editor', BodyEditorControl);
}
