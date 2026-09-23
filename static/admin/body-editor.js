/**
 * `body-editor` field type: the article body as plain Markdown, with quick insertion of the blog's
 * special notations (Zola shortcodes) that the preview pane renders.
 *
 * - The toolbar and a palette (⌘/ on macOS, Ctrl+/ elsewhere) insert a notation at the caret. The
 *   selected text, if any, becomes its content, e.g. the quote of a ref.
 * - After insertion, Tab / Shift+Tab move between the notation's fields (url, title, body…), and
 *   Enter does the same in one-line fields. Tab after the last field, or Escape, finishes the
 *   notation and drops optional arguments that were left empty.
 * - Images that are pasted, dropped or chosen with the 画像 button are handed to the CMS with
 *   `addFile`, saved next to index.md with the entry, and inserted as `{{ img(...) }}`.
 *
 * The textarea is uncontrolled: typing never waits for a round trip through the CMS store, which
 * keeps the caret, undo history and IME composition intact. A value that comes from outside
 * (revert, restored draft) is written back only when it differs from what the editor reported.
 */
import { IMAGE_SNIPPET, SNIPPETS, buildSnippet, removeEmptyOptionalArgs, surroundings, syntaxOf } from './snippets.js';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
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
    return { paletteOpen: false, query: '', active: 0, sessionActive: false, busy: false, message: '', error: false };
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
   * the page shorter for a moment, and the browser clamps the edit pane's scroll position when
   * that happens. Remember every scrolled ancestor and put it back, or the view would jump up
   * whenever a long body is edited below the first screen.
   */
  resize: function () {
    const textarea = this.textarea;

    if (!textarea) return;

    const scrolled = [];

    for (let node = textarea.parentElement; node; node = node.parentElement) {
      if (node.scrollTop > 0) scrolled.push([node, node.scrollTop]);
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
    scrolled.forEach(([node, top]) => {
      node.scrollTop = top;
    });
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
    const field = session.fields[session.index];
    const delta = after.length - before.length;
    const caret = this.textarea.selectionStart;
    let prefix = 0;

    while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;

    // Typing, pasting and IME composition all end at the caret.
    const oldEnd = caret - delta;
    const oldStart = Math.min(prefix, oldEnd);

    if (oldStart < field.start || oldEnd > field.end) {
      this.endSession();

      return;
    }

    field.end += delta;
    session.fields.slice(session.index + 1).forEach((f) => {
      f.start += delta;
      f.end += delta;
    });
    session.end += delta;
    session.exit += delta;
  },

  fieldAtCaret: function () {
    const session = this.session;
    const caret = this.textarea.selectionStart;
    const current = session.fields[session.index];

    if (current && caret >= current.start && caret <= current.end) return session.index;

    return session.fields.findIndex((f) => caret >= f.start && caret <= f.end);
  },

  selectField: function (index) {
    const field = this.session.fields[index];

    this.session.index = index;
    this.textarea.setSelectionRange(field.start, field.end);
  },

  endSession: function () {
    if (!this.session) return;

    this.session = null;
    this.setState({ sessionActive: false });
  },

  /** Close the open notation; with `cleanup`, drop empty optional arguments and move past it. */
  finishSession: function (cleanup) {
    const session = this.session;
    const textarea = this.textarea;

    if (!session) return;

    this.endSession();

    let exit = session.exit;

    if (cleanup && session.optional.length) {
      const original = textarea.value.slice(session.start, session.end);
      const cleaned = removeEmptyOptionalArgs(original, session.optional);

      if (cleaned !== original) {
        textarea.setSelectionRange(session.start, session.end);
        insertText(textarea, cleaned);
        exit += cleaned.length - original.length;
      }
    }

    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(exit, exit);
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
      fields: fields.map((f) => ({ ...f, start: base + f.start, end: base + f.end })),
      index: 0,
      start: base,
      end: base + text.length,
      exit,
      optional: snippet.optional ?? [],
    };
    this.setState({ sessionActive: true, message: '', error: false });

    const firstEmpty = this.session.fields.findIndex((f) => f.start === f.end);

    this.selectField(firstEmpty >= 0 ? firstEmpty : 0);
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
    const { paletteOpen, sessionActive, busy, message, error } = this.state;
    const status = sessionActive
      ? 'Tab: 次の欄　Shift+Tab: 前の欄　Esc: 確定 (空の任意項目は消えます)'
      : message || `記法はボタンか ${PALETTE_KEY} で挿入。画像は貼り付けかドロップでも追加できます`;

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
      h('div', { className: error ? 'be-status be-error' : 'be-status', 'aria-live': 'polite' }, status),
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
