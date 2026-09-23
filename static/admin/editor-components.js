/**
 * Editor components for the rich text mode of the body field.
 *
 * Each component maps one Zola shortcode to a small form, so that it can be inserted from the
 * editor's Insert menu and edited without remembering the argument names. The `pattern` /
 * `toBlock` pair is lossless for every argument the shortcode accepts, because Sveltia CMS
 * re-serializes matched blocks on save.
 *
 * `ref` is deliberately not a component: it is used inline inside sentences and list items,
 * and a block component would move it into its own paragraph. It is still rendered by the
 * preview template through `transformShortcodes`.
 */
import { blockPattern, formatArgs, inlinePattern, longestBacktickRun, parseArgs, renderers, splitFence } from './shortcodes.js';

const note = {
  id: 'note',
  label: 'Note (注意書き)',
  icon: 'info',
  fields: [
    { name: 'type', label: '種類', widget: 'select', options: ['info', 'warn', 'alert'], default: 'info' },
    { name: 'body', label: '本文', widget: 'markdown' },
  ],
  pattern: blockPattern('note', ''),
  fromBlock: (match) => ({
    type: String(parseArgs(match[2]).type ?? 'info'),
    body: String(match[3] ?? '').trim(),
  }),
  toBlock: ({ type = 'info', body = '' }) => `{% note(type="${type}") %}\n${body}\n{% end %}`,
  toPreview: ({ type = 'info', body = '' }) => renderers.note({ type }, body),
};

const code = {
  id: 'code',
  label: 'Code (ファイル名付きコード)',
  icon: 'code_blocks',
  fields: [
    { name: 'file', label: 'ファイル名 (タブに表示)', widget: 'string', required: false },
    { name: 'lang', label: '言語 (省略時はコードの ``` の言語か拡張子から推定)', widget: 'string', required: false },
    { name: 'theme', label: 'テーマ', widget: 'select', options: ['dark', 'light'], default: 'dark', required: false },
    { name: 'code', label: 'コード', widget: 'text' },
    // Language written on the fence inside the block; kept apart from `lang` so that a block
    // whose language came only from the fence is written back byte for byte.
    { name: 'fenceLang', widget: 'hidden', required: false },
  ],
  pattern: blockPattern('code', ''),
  fromBlock: (match) => {
    const args = parseArgs(match[2]);
    const fenced = splitFence(match[3] ?? '');

    return {
      file: String(args.file ?? args.title ?? ''),
      lang: String(args.language ?? ''),
      theme: String(args.theme ?? 'dark'),
      code: fenced ? fenced.code : String(match[3] ?? '').trim(),
      fenceLang: String(fenced?.lang ?? ''),
    };
  },
  toBlock: ({ file = '', lang = '', theme = 'dark', code = '', fenceLang = '' }) => {
    const fence = '`'.repeat(Math.max(3, longestBacktickRun(code) + 1));
    // code.html fails the Zola build without `file` (or `title`), so always write it.
    // Zola hides a `lang` argument behind the page language, so the hint goes in `language`.
    const rest = formatArgs({ language: lang, theme: theme === 'dark' ? '' : theme });
    const args = `file="${String(file).replace(/"/g, '\\"')}"${rest ? `, ${rest}` : ''}`;

    return `{% code(${args}) %}\n${fence}${lang || fenceLang}\n${code}\n${fence}\n{% end %}`;
  },
  toPreview: ({ file = '', lang = '', theme = 'dark', code = '', fenceLang = '' }) =>
    renderers.code({ file, lang: lang || fenceLang, theme }, code),
};

const IMG_ORDER = ['src', 'alt', 'percent', 'caption', 'link', 'class', 'style'];

const img = {
  id: 'img',
  label: 'Image (記事フォルダの画像)',
  icon: 'image',
  fields: [
    { name: 'src', label: '画像', widget: 'image' },
    { name: 'alt', label: '代替テキスト', widget: 'string', required: false },
    { name: 'caption', label: 'キャプション', widget: 'string', required: false },
    { name: 'percent', label: '幅 (元画像に対する比率。既定 0.6)', widget: 'number', value_type: 'float', min: 0.1, max: 1, step: 0.1, required: false },
    { name: 'link', label: '原寸を新しいタブで開く', widget: 'boolean', default: false, required: false },
    { name: 'class', label: 'CSS class', widget: 'string', required: false },
    { name: 'style', label: 'style 属性', widget: 'string', required: false },
  ],
  pattern: inlinePattern('img', ''),
  fromBlock: (match) => parseArgs(match[2]),
  toBlock: (data = {}) => `{{ img(${formatArgs({ ...data, link: data.link ? true : undefined }, IMG_ORDER)}) }}`,
  toPreview: (data = {}) => renderers.img(data),
};

const LINK_ORDER = ['url', 'title', 'desc', 'image', 'site', 'favicon', 'caption'];

const link = {
  id: 'link',
  label: 'Link card (リンクカード)',
  icon: 'link',
  fields: [
    { name: 'url', label: 'URL', widget: 'string' },
    { name: 'title', label: 'タイトル', widget: 'string', required: false },
    { name: 'desc', label: '説明', widget: 'string', required: false },
    { name: 'image', label: 'サムネイル画像の URL', widget: 'string', required: false },
    { name: 'site', label: 'サイト名 (省略時はホスト名)', widget: 'string', required: false },
    { name: 'favicon', label: 'favicon の URL', widget: 'string', required: false },
    { name: 'caption', label: 'キャプション', widget: 'string', required: false },
  ],
  pattern: inlinePattern('link', ''),
  fromBlock: (match) => parseArgs(match[2]),
  toBlock: (data = {}) => `{{ link(${formatArgs(data, LINK_ORDER)}) }}`,
  toPreview: (data = {}) => renderers.link(data),
};

export function registerEditorComponents() {
  for (const component of [note, code, img, link]) {
    CMS.registerEditorComponent(component);
  }
}
