/**
 * The Markdown view of the editor (editor-page.ts): the post in the article's type, with its marks
 * (`##`, `**`, `` ` ``, `[…](…)`, `>`, `-`) hidden on every line except the lines that hold the
 * cursor or the selection, where the Markdown shows as written. Images show in place of their
 * Markdown, and notes, quotations and figure captions look as on the site (src/markdown/). The
 * styles are in src/styles/admin.css.
 */
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import type { EditorState, Extension, Range } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import type { SyntaxNode, SyntaxNodeRef } from '@lezer/common';
import type { MarkdownConfig } from '@lezer/markdown';
import { frontmatterFields } from '../lib/frontmatter.ts';
import { CALLOUTS, SOURCE_LINE, type CalloutType } from '../markdown/syntax.ts';

/* ---------------------------------------------------------------- parsing */

const FENCE = /^---[ \t]*$/;

/** The front matter between `---` lines at the top of a post, which is YAML rather than Markdown. */
const frontmatter: MarkdownConfig = {
  defineNodes: [{ name: 'Frontmatter', block: true }],
  parseBlock: [
    {
      name: 'Frontmatter',
      before: 'HorizontalRule',
      parse(cx, line) {
        if (cx.lineStart !== 0 || !FENCE.test(line.text)) return false;
        while (cx.nextLine()) {
          if (FENCE.test(line.text)) {
            cx.nextLine();
            break;
          }
        }
        cx.addElement(cx.elt('Frontmatter', 0, cx.prevLineEnd()));
        return true;
      },
    },
  ],
};

/** Markdown with GitHub's extensions, as on the site, and the front matter. */
export const markdownSupport = (): Extension => markdown({ base: markdownLanguage, extensions: frontmatter });

/* ---------------------------------------------------------------- widgets */

class ImageWidget extends WidgetType {
  readonly src: string;
  readonly alt: string;

  constructor(src: string, alt: string) {
    super();
    this.src = src;
    this.alt = alt;
  }

  override eq(other: ImageWidget): boolean {
    return other.src === this.src && other.alt === this.alt;
  }

  override toDOM(view: EditorView): HTMLElement {
    const image = document.createElement('img');
    image.className = 'cm-md-image';
    image.alt = this.alt;
    // The line grows when the image arrives.
    image.addEventListener('load', () => view.requestMeasure());
    image.addEventListener('error', () => {
      image.classList.add('cm-md-image-missing');
      view.requestMeasure();
    });
    image.src = this.src;
    return image;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

class TextWidget extends WidgetType {
  readonly text: string;
  readonly className: string;

  constructor(text: string, className: string) {
    super();
    this.text = text;
    this.className = className;
  }

  override eq(other: TextWidget): boolean {
    return other.text === this.text && other.className === this.className;
  }

  override toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = this.className;
    span.textContent = this.text;
    return span;
  }
}

/** The icon and name of a note (`[!NOTE]` → 補足), in the note's colour. */
class NoteLabelWidget extends WidgetType {
  readonly label: string;

  constructor(label: string) {
    super();
    this.label = label;
  }

  override eq(other: NoteLabelWidget): boolean {
    return other.label === this.label;
  }

  override toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-md-note-label';
    const icon = document.createElement('span');
    icon.className = 'note-icon';
    icon.setAttribute('aria-hidden', 'true');
    span.append(icon, this.label);
    return span;
  }
}

/* ---------------------------------------------------------------- decorations */

const hidden = Decoration.replace({});
const dimmed = Decoration.mark({ class: 'cm-md-mark' });
const emphasis = Decoration.mark({ class: 'cm-md-em' });
const strong = Decoration.mark({ class: 'cm-md-strong' });
const strike = Decoration.mark({ class: 'cm-md-strike' });
const code = Decoration.mark({ class: 'cm-md-code' });
const link = Decoration.mark({ class: 'cm-md-link' });
const fence = Decoration.mark({ class: 'cm-md-fence' });
const bullet = Decoration.replace({ widget: new TextWidget('•', 'cm-md-bullet') });
const rule = Decoration.replace({ widget: new TextWidget('', 'cm-md-hr') });

/** The first line of a note, `> [!NOTE]` (see CALLOUT_MARKER in src/markdown/syntax.ts). */
const CALLOUT_LINE = /^([ \t]*>[ \t]?)(\[!(note|tip|important|warning|caution)\])[ \t]*$/i;

/** Turns the URL of an image in the Markdown into the URL to show it from. */
export type ImageSource = (url: string) => string;

function buildDecorations(view: EditorView, imageSource: ImageSource): DecorationSet {
  const { state } = view;
  const { doc } = state;
  const ranges: Range<Decoration>[] = [];

  // Lines that hold the cursor or the selection show their Markdown as written.
  const active = new Set<number>();
  for (const range of state.selection.ranges) {
    for (let n = doc.lineAt(range.from).number, last = doc.lineAt(range.to).number; n <= last; n += 1) {
      active.add(n);
    }
  }
  const isActive = (from: number, to: number) => {
    for (let n = doc.lineAt(from).number, last = doc.lineAt(to).number; n <= last; n += 1) {
      if (active.has(n)) return true;
    }
    return false;
  };

  const visibleFrom = view.visibleRanges[0]?.from ?? 0;
  const visibleTo = view.visibleRanges[view.visibleRanges.length - 1]?.to ?? 0;
  const firstVisibleLine = doc.lineAt(visibleFrom).number;
  const lastVisibleLine = doc.lineAt(visibleTo).number;

  /** `className` on the visible lines of a block; `first` and `last` on its first and last lines. */
  const lines = (from: number, to: number, className: string, first?: string, last?: string) => {
    const firstLine = doc.lineAt(from).number;
    const lastLine = doc.lineAt(to).number;
    for (let n = Math.max(firstLine, firstVisibleLine); n <= Math.min(lastLine, lastVisibleLine); n += 1) {
      const classes = [className];
      if (n === firstLine && first) classes.push(first);
      if (n === lastLine && last) classes.push(last);
      ranges.push(Decoration.line({ class: classes.join(' ') }).range(doc.line(n).from));
    }
  };

  const style = (from: number, to: number, decoration: Decoration) => {
    if (from < to) ranges.push(decoration.range(from, to));
  };

  /** `decoration` in place of from…to, except on the lines being edited. Returns whether it was placed. */
  const replace = (from: number, to: number, decoration: Decoration) => {
    // Decorations from a view plugin may not replace line breaks.
    if (from >= to || isActive(from, to) || doc.sliceString(from, to).includes('\n')) return false;
    ranges.push(decoration.range(from, to));
    return true;
  };

  /** A Markdown mark: hidden, or dimmed on the lines being edited. */
  const markup = (from: number, to: number) => {
    if (!replace(from, to, hidden)) style(from, to, dimmed);
  };

  /** `##` and `>` with the space after them. */
  const withSpace = (to: number) => (doc.sliceString(to, to + 1) === ' ' ? to + 1 : to);

  /** Note markers (`[!NOTE]`), which the parser reads as links. */
  const labels: { from: number; to: number }[] = [];

  const visit = (node: SyntaxNodeRef): boolean | void => {
    const { from, to } = node;
    switch (node.name) {
      case 'Frontmatter':
        lines(from, to, 'cm-md-frontmatter', 'cm-md-frontmatter-first', 'cm-md-frontmatter-last');
        return false;

      case 'ATXHeading1':
      case 'ATXHeading2':
      case 'ATXHeading3':
      case 'ATXHeading4':
      case 'ATXHeading5':
      case 'ATXHeading6':
        lines(from, to, `cm-md-h${node.name.slice(-1)}`);
        return;
      case 'HeaderMark':
        markup(from, withSpace(to));
        return;

      case 'Emphasis':
        style(from, to, emphasis);
        return;
      case 'StrongEmphasis':
        style(from, to, strong);
        return;
      case 'Strikethrough':
        style(from, to, strike);
        return;
      case 'EmphasisMark':
      case 'StrikethroughMark':
        markup(from, to);
        return;
      case 'Escape':
        // The backslash of `\*`.
        markup(from, from + 1);
        return;

      case 'InlineCode': {
        const marks = node.node.getChildren('CodeMark');
        if (marks.length < 2) return false;
        const open = marks[0];
        const close = marks[marks.length - 1];
        markup(open.from, open.to);
        markup(close.from, close.to);
        style(open.to, close.from, code);
        return false;
      }

      case 'Link': {
        if (labels.some((label) => from >= label.from && to <= label.to)) return false;
        const marks = node.node.getChildren('LinkMark');
        if (marks.length < 2) return;
        const textFrom = marks[0].to;
        const textTo = marks[1].from;
        // `[^1]`, a footnote reference, shows as written.
        if (doc.sliceString(textFrom, textFrom + 1) === '^') return false;
        markup(from, textFrom);
        markup(textTo, to);
        style(textFrom, textTo, link);
        return;
      }
      case 'Autolink':
        for (const mark of node.node.getChildren('LinkMark')) markup(mark.from, mark.to);
        return;
      case 'URL': {
        const parent = node.node.parent?.name;
        if (parent !== 'Link' && parent !== 'Image' && parent !== 'LinkReference') style(from, to, link);
        return;
      }

      case 'Image': {
        const url = node.node.getChild('URL');
        if (url) {
          const marks = node.node.getChildren('LinkMark');
          const alt = marks.length >= 2 ? doc.sliceString(marks[0].to, marks[1].from) : '';
          const widget = new ImageWidget(imageSource(doc.sliceString(url.from, url.to)), alt);
          replace(from, to, Decoration.replace({ widget }));
        }
        return false;
      }
      case 'Paragraph': {
        // A paragraph starting with an image is a figure, and its next lines are the caption.
        const first = node.node.firstChild;
        if (first?.name === 'Image' && first.from === from) {
          const imageLine = doc.lineAt(first.to);
          lines(imageLine.from, imageLine.from, 'cm-md-figure');
          if (imageLine.to < to) lines(imageLine.to + 1, to, 'cm-md-figcaption');
        }
        return;
      }

      case 'Blockquote': {
        const firstLine = doc.lineAt(from);
        const callout = CALLOUT_LINE.exec(firstLine.text);
        if (callout) {
          const { className, label } = CALLOUTS[callout[3].toLowerCase() as CalloutType];
          lines(from, to, `cm-md-note ${className}`, 'cm-md-note-first', 'cm-md-note-last');
          const markerFrom = firstLine.from + callout[1].length;
          const markerTo = markerFrom + callout[2].length;
          labels.push({ from: markerFrom, to: markerTo });
          if (!replace(markerFrom, markerTo, Decoration.replace({ widget: new NoteLabelWidget(label) }))) {
            style(markerFrom, markerTo, dimmed);
          }
          return;
        }
        lines(from, to, 'cm-md-quote', 'cm-md-quote-first', 'cm-md-quote-last');
        // A last paragraph starting with `出典:` names the source of the quotation.
        let last: SyntaxNode | null = null;
        let blocks = 0;
        for (let child = node.node.firstChild; child; child = child.nextSibling) {
          if (child.name === 'QuoteMark') continue;
          blocks += 1;
          last = child;
        }
        if (last?.name === 'Paragraph' && blocks >= 2) {
          if (SOURCE_LINE.test(doc.sliceString(last.from, last.to).trimStart())) {
            lines(last.from, last.to, 'cm-md-quote-source', 'cm-md-quote-source-first');
          }
        }
        return;
      }
      case 'QuoteMark':
        markup(from, withSpace(to));
        return;

      case 'ListMark':
        if (node.node.parent?.parent?.name === 'BulletList' && !replace(from, to, bullet)) style(from, to, dimmed);
        return;

      case 'FencedCode': {
        lines(from, to, 'cm-md-codeblock', 'cm-md-codeblock-first', 'cm-md-codeblock-last');
        const open = doc.lineAt(from);
        const close = doc.lineAt(to);
        style(open.from, open.to, fence);
        if (close.number > open.number && /^\s*(?:```|~~~)/.test(close.text)) style(close.from, close.to, fence);
        return false;
      }
      case 'CodeBlock':
        lines(from, to, 'cm-md-codeblock', 'cm-md-codeblock-first', 'cm-md-codeblock-last');
        return false;
      case 'Table':
        lines(from, to, 'cm-md-table');
        return false;
      case 'HTMLBlock':
        lines(from, to, 'cm-md-html');
        return false;
      case 'HorizontalRule':
        if (!replace(from, to, rule)) style(from, to, dimmed);
        return false;

      default:
        return;
    }
  };

  syntaxTree(state).iterate({ from: visibleFrom, to: visibleTo, enter: visit });
  return Decoration.set(ranges, true);
}

/** The live preview. `imageSource` gives the URL to show each image from. */
export function livePreview(imageSource: ImageSource): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, imageSource);
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.selectionSet ||
          update.viewportChanged ||
          syntaxTree(update.state) !== syntaxTree(update.startState)
        ) {
          this.decorations = buildDecorations(update.view, imageSource);
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}

/** The editor in the article's type (src/styles/global.css: `body` and `.content`). */
export const articleTheme = EditorView.theme({
  '&': { color: 'var(--text)', backgroundColor: 'transparent', fontSize: '16px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.7' },
  '.cm-content': { padding: '0', caretColor: 'var(--text)' },
  '.cm-line': { padding: '0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text)' },
});

/* ---------------------------------------------------------------- images of the post */

/**
 * The name of the file in the post's folder that an image URL in the post points to (`./a.webp`
 * and `a.webp` → `a.webp`), or undefined for images on other sites, on the site (`/images/…`) and
 * in subfolders.
 */
export function folderFileName(url: string): string | undefined {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('/') || url.startsWith('#')) return undefined;
  let path = url.startsWith('./') ? url.slice(2) : url;
  try {
    path = decodeURI(path);
  } catch {
    // Kept as written.
  }
  return path && !path.includes('/') ? path : undefined;
}

/**
 * The files of the post's folder that the post shows: the `hero` of the front matter and the
 * Markdown images (code blocks are skipped). A save must have each of them in the folder, or the
 * build fails.
 */
export function folderImages(state: EditorState): string[] {
  const names = new Set<string>();
  const hero = frontmatterFields(state.doc.sliceString(0, Math.min(state.doc.length, 20_000))).get('hero');
  const heroName = hero ? folderFileName(hero) : undefined;
  if (heroName) names.add(heroName);
  const tree = ensureSyntaxTree(state, state.doc.length, 5000) ?? syntaxTree(state);
  tree.iterate({
    enter: (node) => {
      if (node.name === 'FencedCode' || node.name === 'CodeBlock') return false;
      if (node.name !== 'Image') return;
      const url = node.node.getChild('URL');
      const name = url ? folderFileName(state.doc.sliceString(url.from, url.to)) : undefined;
      if (name) names.add(name);
      return false;
    },
  });
  return [...names];
}
