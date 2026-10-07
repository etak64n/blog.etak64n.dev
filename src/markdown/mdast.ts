/**
 * Markdown-level (mdast) plugins for Sätteri, Astro's Markdown processor. Each one gives a meaning
 * to plain Markdown that also reads well on GitHub and in the VS Code preview, so posts need no
 * custom syntax. See docs/architecture.md for the list.
 */
import { defineMdastPlugin, type Custom } from 'satteri';
import type { PhrasingContent } from 'mdast';

type Child = NonNullable<Custom['children']>[number];

/**
 * A node rendered as the element `tag`: Sätteri turns a node of a type it does not know into the
 * element named by `data.hName`, with `data.hProperties` as attributes.
 */
function element(
  tag: string,
  classNames: string[],
  children: Child[],
  properties: Record<string, string> = {},
): Custom {
  const hProperties = classNames.length > 0 ? { ...properties, className: classNames } : properties;
  return {
    type: `blog-${tag}`,
    data: { hName: tag, hProperties } as Custom['data'],
    children,
  };
}

/** `children` without the line breaks and whitespace at its start. */
function trimStart(children: readonly PhrasingContent[]): PhrasingContent[] {
  const rest = [...children];
  while (rest.length > 0) {
    const first = rest[0];
    if (first.type === 'break') {
      rest.shift();
    } else if (first.type === 'text' && first.value.trimStart() !== first.value) {
      const value = first.value.trimStart();
      if (value) {
        rest[0] = { type: 'text', value };
        break;
      }
      rest.shift();
    } else {
      break;
    }
  }
  return rest;
}

/**
 * Matches `pattern` against the text at the start of `children` (the leading text nodes, which the
 * parser may split) and returns the children after the matched text.
 */
function stripLeadingText(
  children: readonly PhrasingContent[],
  pattern: RegExp,
): { match: RegExpExecArray; rest: PhrasingContent[] } | undefined {
  let count = 0;
  let text = '';
  for (const child of children) {
    if (child.type !== 'text') break;
    text += child.value;
    count += 1;
  }
  const match = pattern.exec(text);
  if (!match) return undefined;
  const remainder = text.slice(match[0].length);
  const rest = children.slice(count);
  return { match, rest: remainder ? [{ type: 'text', value: remainder }, ...rest] : rest };
}

const CALLOUT_LABELS = {
  note: '補足',
  tip: 'ヒント',
  important: '重要',
  warning: '注意',
  caution: '警告',
} as const;

type CalloutType = keyof typeof CALLOUT_LABELS;

/** `[!NOTE]` alone on the first line of a blockquote, as in GitHub's alerts. */
const CALLOUT_MARKER = /^\[!(note|tip|important|warning|caution)\][^\S\n]*(?:\n|$)/i;

/**
 * GitHub-style alerts: a blockquote starting with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`
 * or `[!CAUTION]` becomes `<div class="callout callout-note" role="note">` with a title.
 */
export const callouts = defineMdastPlugin({
  name: 'blog-callouts',
  blockquote(node, ctx) {
    const [first, ...others] = node.children;
    if (first?.type !== 'paragraph') return;
    const stripped = stripLeadingText(first.children, CALLOUT_MARKER);
    if (!stripped) return;
    const type = stripped.match[1].toLowerCase() as CalloutType;
    const lead = trimStart(stripped.rest);
    const body: Child[] = lead.length > 0 ? [{ type: 'paragraph', children: lead }, ...others] : others;
    const title = element('p', ['callout-title'], [{ type: 'text', value: CALLOUT_LABELS[type] }]);
    ctx.replaceNode(node, element('div', ['callout', `callout-${type}`], [title, ...body], { role: 'note' }));
  },
});

/** The line naming the source of a quotation, e.g. `出典: [タイトル](https://example.com/)`. */
const SOURCE_LINE = /^出典[:：]/;

/**
 * Quotations with a source: a blockquote whose last paragraph starts with `出典:` becomes
 * `<figure class="quote">` holding the quotation and a `<figcaption>` with the source.
 */
export const quoteSources = defineMdastPlugin({
  name: 'blog-quote-sources',
  blockquote(node, ctx) {
    const last = node.children.at(-1);
    if (node.children.length < 2 || last?.type !== 'paragraph') return;
    if (!SOURCE_LINE.test(ctx.textContent(last).trimStart())) return;
    ctx.replaceNode(
      node,
      element(
        'figure',
        ['quote'],
        [
          { type: 'blockquote', children: node.children.slice(0, -1) },
          element('figcaption', [], trimStart(last.children)),
        ],
      ),
    );
  },
});

/**
 * Figures: a paragraph that starts with its only image becomes `<figure>`, and the text after the
 * image (usually on the next line) becomes its `<figcaption>`.
 */
export const figures = defineMdastPlugin({
  name: 'blog-figures',
  paragraph(node, ctx) {
    const [image, ...rest] = node.children;
    if (image?.type !== 'image') return;
    if (rest.some((child) => child.type === 'image' || child.type === 'imageReference')) return;
    const caption = trimStart(rest);
    const children: Child[] = caption.length > 0 ? [image, element('figcaption', [], caption)] : [image];
    ctx.replaceNode(node, element('figure', [], children));
  },
});
