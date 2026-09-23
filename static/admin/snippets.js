/**
 * The blog's special notations (Zola shortcodes) as snippets for the body editor.
 *
 * `${name}` marks a field. After insertion the editor visits the fields in order with Tab and
 * selects each one, so typing replaces it. A field starts with its `samples` entry, an example of
 * what goes there (the selected text goes into the `wrap` field instead), and `labels` names it
 * in the status line, where `optional` and `clear` fields are marked as optional (`hints`
 * overrides that text).
 *
 * When the snippet is finished, a field that still holds its example is dropped together with its
 * argument if listed in `optional`, emptied if listed in `clear` (for fields that are not
 * arguments, such as the language of a code fence), and kept otherwise: a URL or a body left as
 * the example stays visible in the preview. Empty `optional` arguments are dropped as well, so
 * list only arguments that the Tera template handles when they are missing. Fields in `multiline`
 * take several lines, and Enter inserts a newline there instead of moving on.
 */
const NOTE_LABELS = { body: '本文' };
const OPTIONAL_HINT = '省略可。例のままなら消えます';

export const SNIPPETS = [
  {
    id: 'ref',
    label: '参照',
    description: '文中に出典のピルを置く。選択中の文字は引用文になる',
    keywords: 'ref reference 参照 出典 引用 さんしょう',
    inline: true,
    template: '{% ref(url="${url}", title="${title}") %}\n${body}\n{% end %}',
    samples: { url: 'https://example.com/source', title: '出典のタイトル', body: '引用する一文' },
    labels: { url: '出典の URL', title: '出典のタイトル', body: '引用文' },
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
    samples: { body: '補足の内容' },
    labels: NOTE_LABELS,
    wrap: 'body',
    multiline: ['body'],
  },
  {
    id: 'note-warn',
    label: '注意',
    description: '黄色い注記ボックス',
    keywords: 'note warn warning 注意 ちゅうい',
    template: '{% note(type="warn") %}\n${body}\n{% end %}',
    samples: { body: '注意してほしいこと' },
    labels: NOTE_LABELS,
    wrap: 'body',
    multiline: ['body'],
  },
  {
    id: 'note-alert',
    label: '警告',
    description: '赤い注記ボックス',
    keywords: 'note alert danger 警告 けいこく',
    template: '{% note(type="alert") %}\n${body}\n{% end %}',
    samples: { body: '警告の内容' },
    labels: NOTE_LABELS,
    wrap: 'body',
    multiline: ['body'],
  },
  {
    id: 'code',
    label: 'コード',
    description: 'ファイル名のタブ付きコード。言語は拡張子から推定',
    keywords: 'code コード ファイル file',
    template: '{% code(file="${file}") %}\n```${lang}\n${code}\n```\n{% end %}',
    samples: { file: 'main.py', lang: 'python', code: 'print("Hello, world!")' },
    labels: { file: 'ファイル名', lang: '言語', code: 'コード' },
    hints: { lang: '省略可。例のままなら消え、ファイル名の拡張子から推定します' },
    wrap: 'code',
    multiline: ['code'],
    optional: ['file'],
    clear: ['lang'],
  },
  {
    id: 'codebox',
    label: 'コード枠',
    description: 'タイトルと言語を指定するコード枠',
    keywords: 'codebox コード枠 box',
    template: '{% codebox(title="${title}", language="${language}") %}\n${code}\n{% end %}',
    samples: { title: 'main.tf', language: 'hcl', code: 'resource "aws_s3_bucket" "example" {}' },
    labels: { title: 'タイトル (ファイル名ならタブに表示)', language: '言語', code: 'コード' },
    wrap: 'code',
    multiline: ['code'],
    optional: ['title', 'language'],
  },
  {
    id: 'link',
    label: 'リンクカード',
    description: 'URL をカードで表示。選択中の URL はそのまま使う',
    keywords: 'link card リンク カード url',
    template: '{{ link(url="${url}", title="${title}", desc="${desc}") }}',
    samples: { url: 'https://example.com/article', title: 'ページのタイトル', desc: 'ページの説明' },
    labels: { url: 'リンク先の URL', title: 'タイトル', desc: '説明' },
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
  samples: { alt: '画像の説明' },
  labels: { src: '画像', alt: '代替テキスト' },
  optional: ['alt'],
};

/** A short, readable form of the syntax, with the sample values, for tooltips and the palette. */
export const syntaxOf = (snippet) =>
  snippet.template
    ? snippet.template.replace(/\$\{(\w+)\}/g, (_, name) => snippet.samples?.[name] ?? '').replace(/\n\n?/g, ' … ')
    : '{{ img(src="photo.png", alt="画像の説明") }}';

/**
 * Expand a snippet template. Returns the text and the field ranges relative to its start.
 * `values` prefills fields by name; other fields get their sample, recorded as `sample` so that
 * the editor can tell later whether it was replaced (`sample` is null for prefilled fields).
 */
export function buildSnippet(snippet, values = {}) {
  const omissible = [...(snippet.optional ?? []), ...(snippet.clear ?? [])];
  const fields = [];
  let text = '';
  let last = 0;

  for (const match of snippet.template.matchAll(/\$\{(\w+)\}/g)) {
    text += snippet.template.slice(last, match.index);

    const name = match[1];
    const start = text.length;
    const prefilled = values[name];
    const sample = prefilled === undefined ? snippet.samples?.[name] ?? '' : null;

    text += prefilled ?? sample;
    fields.push({
      name,
      start,
      end: text.length,
      sample,
      label: snippet.labels?.[name] ?? name,
      hint: snippet.hints?.[name] ?? (sample && omissible.includes(name) ? OPTIONAL_HINT : ''),
      multiline: (snippet.multiline ?? []).includes(name),
    });
    last = match.index + match[0].length;
  }

  return { text: text + snippet.template.slice(last), fields };
}

/**
 * The final text of a snippet: fields still holding their sample are removed (`optional`) or
 * emptied (`clear`), then empty `optional` arguments are dropped. `fields` hold positions
 * relative to `text`.
 */
export function finishSnippetText(snippet, text, fields) {
  const optional = snippet.optional ?? [];
  const clear = snippet.clear ?? [];
  let result = text;

  // From the last field to the first, so that earlier positions stay valid.
  for (const field of [...fields].sort((a, b) => b.start - a.start)) {
    // `touched` is set by the editor for fields that were edited, even if the sample was typed back.
    const untouched =
      !field.touched && !!field.sample && result.slice(field.start, field.end) === field.sample;

    if (untouched && (optional.includes(field.name) || clear.includes(field.name))) {
      result = result.slice(0, field.start) + result.slice(field.end);
    }
  }

  return removeEmptyOptionalArgs(result, optional);
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
