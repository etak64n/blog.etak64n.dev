/**
 * The blog's special notations (Zola shortcodes) as snippets for the body editor.
 *
 * `${name}` marks a field. After insertion the editor visits the fields in order with Tab. They
 * start empty unless prefilled (the selected text goes into the `wrap` field). Fields listed in
 * `optional` that are still empty when the snippet is finished are removed together with their
 * argument, e.g. a link card without a title falls back to showing the URL instead of nothing.
 * Fields in `multiline` take several lines, so Enter inserts a newline there instead of moving on.
 */
export const SNIPPETS = [
  {
    id: 'ref',
    label: '参照',
    description: '文中に出典のピルを置く。選択中の文字は引用文になる',
    keywords: 'ref reference 参照 出典 引用 さんしょう',
    inline: true,
    template: '{% ref(url="${url}", title="${title}") %}\n${body}\n{% end %}',
    wrap: 'body',
    multiline: ['body'],
    optional: ['title'],
  },
  {
    id: 'note-info',
    label: '補足',
    description: '青い注記ボックス',
    keywords: 'note info 補足 メモ ほそく',
    template: '{% note(type="info") %}\n${body}\n{% end %}',
    wrap: 'body',
    multiline: ['body'],
  },
  {
    id: 'note-warn',
    label: '注意',
    description: '黄色い注記ボックス',
    keywords: 'note warn warning 注意 ちゅうい',
    template: '{% note(type="warn") %}\n${body}\n{% end %}',
    wrap: 'body',
    multiline: ['body'],
  },
  {
    id: 'note-alert',
    label: '警告',
    description: '赤い注記ボックス',
    keywords: 'note alert danger 警告 けいこく',
    template: '{% note(type="alert") %}\n${body}\n{% end %}',
    wrap: 'body',
    multiline: ['body'],
  },
  {
    id: 'code',
    label: 'コード',
    description: 'ファイル名のタブ付きコード。言語は拡張子から推定',
    keywords: 'code コード ファイル file',
    template: '{% code(file="${file}") %}\n```${lang}\n${code}\n```\n{% end %}',
    wrap: 'code',
    multiline: ['code'],
    optional: ['file'],
  },
  {
    id: 'codebox',
    label: 'コード枠',
    description: 'タイトルと言語を指定するコード枠',
    keywords: 'codebox コード枠 box',
    template: '{% codebox(title="${title}", lang="${lang}") %}\n${code}\n{% end %}',
    wrap: 'code',
    multiline: ['code'],
    optional: ['title', 'lang'],
  },
  {
    id: 'link',
    label: 'リンクカード',
    description: 'URL をカードで表示。選択中の URL はそのまま使う',
    keywords: 'link card リンク カード url',
    template: '{{ link(url="${url}", title="${title}", desc="${desc}") }}',
    wrap: 'url',
    optional: ['title', 'desc'],
  },
  {
    id: 'img',
    label: '画像',
    description: '画像を選んで記事フォルダに保存し、img で差し込む',
    keywords: 'img image 画像 写真 がぞう',
    action: 'image',
  },
];

/** Snippet used for images added with `addFile`; `src` is filled in by the editor. */
export const IMAGE_SNIPPET = {
  id: 'img-inline',
  template: '{{ img(src="${src}", alt="${alt}") }}',
  optional: ['alt'],
};

/** A short, readable form of the syntax for tooltips and the palette. */
export const syntaxOf = (snippet) =>
  snippet.template
    ? snippet.template.replace(/\$\{\w+\}/g, '').replace(/\n```\n\n```\n/, '\n```…```\n').replace(/\n\n?/g, ' … ')
    : '{{ img(src="…") }}';

/**
 * Expand a snippet template. Returns the text and the field ranges relative to its start.
 * `values` prefills fields by name.
 */
export function buildSnippet(snippet, values = {}) {
  const fields = [];
  let text = '';
  let last = 0;

  for (const match of snippet.template.matchAll(/\$\{(\w+)\}/g)) {
    text += snippet.template.slice(last, match.index);

    const name = match[1];
    const start = text.length;

    text += values[name] ?? '';
    fields.push({ name, start, end: text.length, multiline: (snippet.multiline ?? []).includes(name) });
    last = match.index + match[0].length;
  }

  return { text: text + snippet.template.slice(last), fields };
}

/**
 * Remove `key=""` arguments for the given keys from the opening tag (first line) of a snippet.
 * `{% code(file="") %}` becomes `{% code() %}`, `link(url="u", title="", desc="")` → `link(url="u")`.
 */
export function removeEmptyOptionalArgs(text, keys) {
  const newline = text.indexOf('\n');
  let head = newline < 0 ? text : text.slice(0, newline);
  const rest = newline < 0 ? '' : text.slice(newline);

  for (const key of keys) {
    head = head.replace(new RegExp(`(\\(|,\\s*)${key}=""(\\s*,\\s*)?`), (_, lead, trail) =>
      lead === '(' ? '(' : trail ? ', ' : '',
    );
  }

  return head + rest;
}

/** Whitespace to put around a snippet: block notations get a paragraph of their own. */
export function surroundings(before, after, inline) {
  if (inline) {
    return { prefix: before === '' || /\s$/.test(before) ? '' : ' ', suffix: '' };
  }

  const prefix = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const suffix = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';

  return { prefix, suffix };
}
