/**
 * Browser-side rendering of the blog's Zola shortcodes for the Sveltia CMS preview.
 *
 * The site renders these with the Tera templates in `templates/shortcodes/`. This module mirrors
 * their HTML so that the preview pane looks like the published article. The output is Markdown
 * with embedded HTML, meant for the preview template (marked + DOMPurify) or an editor
 * component's `toPreview`, both of which parse the Markdown and sanitize the result.
 *
 * Supported: `{% ref %}`, `{% note %}`, `{% code %}`, `{% codebox %}`, `{{ img() }}`, `{{ link() }}`.
 */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// Inside inline HTML, Markdown syntax is still active, so these must be neutralised too.
const MD_ESCAPES = {
  ...HTML_ESCAPES,
  '*': '&#42;',
  _: '&#95;',
  '`': '&#96;',
  '[': '&#91;',
  ']': '&#93;',
  '~': '&#126;',
  '\\': '&#92;',
};

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
/** Escape text that will sit inside inline HTML within a paragraph. */
export const mdText = (value) => String(value ?? '').replace(/[&<>"'*_`[\]~\\]/g, (c) => MD_ESCAPES[c]);

/**
 * Favicon URL for a host, like the site templates: served from this origin by
 * functions/favicon/[host].ts, because both the site and the admin CSP block remote images.
 */
export const faviconOf = (host = '') => (host ? `/favicon/${encodeURIComponent(host)}` : '');

/* ---------------------------------------------------------------- shortcode syntax */

/** Argument list of a shortcode call: quoted strings may contain anything, bare values no `)`. */
export const ARGS_SRC = String.raw`(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^)"'])*`;

/**
 * Pattern for a block shortcode `{% name(args) %}body{% end %}`.
 * Groups: 1 = name, 2 = args, 3 = body. The body must not contain another opening tag, so
 * nested shortcodes are handled innermost-first by `transformShortcodes`.
 */
export const blockPattern = (name = String.raw`(?!end\b)\w+`, flags = 'g') =>
  new RegExp(
    String.raw`\{%-?\s*(${name})\s*(?:\((${ARGS_SRC})\))?\s*-?%\}((?:(?!\{%-?\s*(?!end\b)\w+)[\s\S])*?)\{%-?\s*end\s*-?%\}`,
    flags,
  );

/** Pattern for an inline shortcode `{{ name(args) }}`. Groups: 1 = name, 2 = args. */
export const inlinePattern = (name = String.raw`\w+`, flags = 'g') =>
  new RegExp(String.raw`\{\{-?\s*(${name})\s*\((${ARGS_SRC})\)\s*-?\}\}`, flags);

const ARG_RE = /(\w+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(true|false)\b|(-?\d+(?:\.\d+)?))/g;

/** Parse `key="value", n=0.6, flag=true` into an object with typed values. */
export function parseArgs(text = '') {
  const args = {};

  for (const m of String(text ?? '').matchAll(ARG_RE)) {
    const [, key, dq, sq, bool, num] = m;

    if (dq !== undefined) args[key] = dq.replace(/\\(["\\])/g, '$1');
    else if (sq !== undefined) args[key] = sq.replace(/\\(['\\])/g, '$1');
    else if (bool !== undefined) args[key] = bool === 'true';
    else if (num !== undefined) args[key] = Number(num);
  }

  return args;
}

/** Serialize an argument object back to shortcode syntax, skipping empty values. */
export function formatArgs(args = {}, order = Object.keys(args)) {
  const parts = [];

  for (const key of order) {
    const value = args[key];

    if (value === undefined || value === null || value === '') continue;

    if (typeof value === 'boolean' || typeof value === 'number') {
      parts.push(`${key}=${value}`);
    } else {
      parts.push(`${key}="${String(value).replace(/"/g, '\\"')}"`);
    }
  }

  return parts.join(', ');
}

/* ---------------------------------------------------------------- helpers */

export const hostOf = (url = '') => {
  try {
    return new URL(url).host;
  } catch {
    return String(url).replace(/^https?:\/\//, '').split(/[/?#]/)[0];
  }
};

const slugId = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

export const longestBacktickRun = (code = '') =>
  Math.max(0, ...[...String(code).matchAll(/`+/g)].map((m) => m[0].length));

const EXT_LANG = { 'c++': 'cpp', ts: 'typescript', js: 'javascript', rs: 'rust', py: 'python', sh: 'bash', yml: 'yaml', md: 'markdown' };

const langFromTitle = (title = '') => {
  if (!/\./.test(title)) return '';

  const ext = title.split('.').pop().toLowerCase();

  return EXT_LANG[ext] || ext;
};

/** Split a fenced code block into `{ lang, code }`, or return `null` if the text is not fenced. */
export function splitFence(text = '') {
  const m = String(text).trim().match(/^(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n?\1\s*$/);

  return m ? { lang: m[2].trim().split(/\s+/)[0] || '', code: m[3] } : null;
}

/**
 * Shared HTML for `code` and `codebox`, in the structure of templates/shortcodes/code.html: an
 * optional tab bar with the file name, then the code as a fence that the preview highlights.
 */
function codeboxHtml({ title = '', lang = '', theme = 'dark', code = '' }) {
  const showTab = /(\.|^)([^/\s]+)\.[A-Za-z0-9]+$/.test(title);
  const fenceLang = String(lang || (showTab ? langFromTitle(title) : ''))
    .toLowerCase()
    .replace(/^c\+\+$/, 'cpp');
  const fence = '`'.repeat(Math.max(3, longestBacktickRun(code) + 1));
  const classes = ['codebox', theme === 'dark' ? 'dark' : '', showTab ? 'has-title' : ''].filter(Boolean).join(' ');
  const tab = showTab
    ? `<div class="codebox-header"><span class="codebox-filename">${escapeHtml(title)}</span></div>`
    : '';

  return `<div class="${classes}"><div class="codebox-bar"></div>${tab}\n\n${fence}${fenceLang}\n${code}\n${fence}\n\n</div>`;
}

/* ---------------------------------------------------------------- renderers */

/**
 * One renderer per shortcode: `(args, body) => markdown/html string`.
 * Every renderer must work with an empty argument object.
 */
export const renderers = {
  note(args = {}, body = '') {
    const requested = String(args.type ?? 'info').toLowerCase();
    const type = ['info', 'warn', 'alert'].includes(requested) ? requested : 'info';

    return `<div class="note note-${type}"><div class="note-icon" aria-hidden="true"></div><div class="note-body">\n\n${String(body).trim()}\n\n</div></div>`;
  },

  code(args = {}, body = '') {
    const fenced = splitFence(body);

    return codeboxHtml({
      title: String(args.file ?? args.title ?? ''),
      lang: String(args.language ?? fenced?.lang ?? ''),
      theme: String(args.theme ?? 'dark'),
      code: fenced ? fenced.code : String(body).trim(),
    });
  },

  codebox(args = {}, body = '') {
    return codeboxHtml({
      title: String(args.title ?? args.filename ?? ''),
      // Zola hides a `lang` argument behind the page language, so only `language` counts.
      lang: String(args.language ?? ''),
      theme: String(args.theme ?? 'dark'),
      code: String(body).replace(/^\n+|\n+$/g, ''),
    });
  },

  img(args = {}) {
    const src = String(args.src ?? '');
    const alt = String(args.alt ?? '').replace(/[[\]\n]/g, ' ');
    const dest = /[\s()]/.test(src) ? `<${src}>` : src;
    const image = `![${alt}](${dest})`;
    const data = [];

    // The preview template applies these once the CMS has rendered the image.
    if (args.percent !== undefined && args.percent !== '') data.push(`data-percent="${escapeHtml(args.percent)}"`);
    if (args.class) data.push(`data-img-class="${escapeHtml(args.class)}"`);
    if (args.style) data.push(`data-img-style="${escapeHtml(args.style)}"`);

    const caption = args.caption ? `<figcaption class="muted">${escapeHtml(args.caption)}</figcaption>` : '';

    return `<figure class="img" ${data.join(' ')}>\n\n${args.link ? `[${image}](${dest})` : image}\n\n${caption}</figure>`;
  },

  link(args = {}) {
    const url = String(args.url ?? '');
    const host = String(args.site || hostOf(url));
    const favicon = String(args.favicon || faviconOf(hostOf(url)));
    const title = String(args.title || url);
    const desc = args.desc ? `<div class="link-card-desc">${escapeHtml(args.desc)}</div>` : '';
    const thumb = args.image ? `<div class="link-card-thumb"><img src="${escapeHtml(args.image)}" alt="" loading="lazy"></div>` : '';
    const caption = args.caption ? `<figcaption class="muted">${escapeHtml(args.caption)}</figcaption>` : '';

    return (
      `<figure class="link-card${args.image ? ' has-image' : ''}"><a href="${escapeHtml(url)}" target="_blank" rel="noopener">` +
      `<div class="link-card-body"><div class="link-card-text"><div class="link-card-title">${escapeHtml(title)}</div>${desc}` +
      `<div class="link-card-meta"><img class="link-card-favicon" src="${escapeHtml(favicon)}" alt="" width="16" height="16" loading="lazy" decoding="async">` +
      `<span class="link-card-host">${escapeHtml(host)}</span></div></div>${thumb}</div></a>${caption}</figure>`
    );
  },

  /** Hover reference pill. Rendered on a single line because it sits inside a paragraph. */
  ref(args = {}, body = '') {
    const url = String(args.url ?? '');
    const host = String(args.host || hostOf(url)).toLowerCase();
    const title = String(args.title || url);
    const label = String(args.label || host);
    const excerpt = String(args.excerpt || body || '').trim();
    const lines = excerpt ? excerpt.split('\n').map((line) => line.trim()).filter(Boolean) : [];
    const id = String(args.id || slugId(`ref-${args.site || host}-${title}`));
    const favicon = String(args.icon || faviconOf(host));
    const icon = (cls) =>
      favicon ? `<img src="${escapeHtml(favicon)}" alt="" class="${cls}" width="18" height="18" loading="lazy" decoding="async">` : '';
    const hostSpan = (cls) => (host ? `<span class="${cls}">${mdText(host)}</span>` : '');
    const badge = args.badge ? `<span class="ref-trigger-badge" role="link" tabindex="0">${mdText(args.badge)}</span>` : '';
    const subtitle = args.subtitle ? `<span class="ref-panel-subtitle">${mdText(args.subtitle)}</span>` : '';
    const date = args.date ? `<span class="ref-panel-date">${mdText(args.date)}</span>` : '';
    const text = lines.length
      ? `<span class="ref-panel-text">${lines.map((line) => `<span class="ref-panel-line">${mdText(line)}</span>`).join('')}</span>`
      : '';
    const panelBody = subtitle || date || text ? `<span class="ref-panel-body">${subtitle}${date}${text}</span>` : '';

    return (
      `<span class="ref" data-ref="${escapeHtml(id)}">` +
      `<span class="ref-trigger" role="button" tabindex="0" aria-label="${escapeHtml(title)}">` +
      `<span class="ref-trigger-meta">${icon('ref-trigger-icon')}${hostSpan('ref-trigger-host')}</span>` +
      `<span class="ref-trigger-text sr-only">${mdText(label)}</span>${badge}</span>` +
      `<span class="ref-panel" role="tooltip"><span class="ref-panel-meta">${icon('ref-panel-icon')}${hostSpan('ref-panel-host')}</span>` +
      `<span class="ref-panel-title">${mdText(title)}</span>${panelBody}</span></span>`
    );
  },
};

/* ---------------------------------------------------------------- transform */

const FENCE_RE = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1[ \t]*$/gm;
const INLINE_CODE_RE = /`+[^`\n]+`+/g;

/**
 * Replace every supported shortcode in a Markdown document with its preview HTML.
 * Code blocks and code spans are left untouched; unknown shortcodes are kept as written.
 */
export function transformShortcodes(markdown = '') {
  const stash = [];
  const keep = (text) => {
    stash.push(text);

    return `\u0000${stash.length - 1}\u0000`;
  };
  const restore = (text) => text.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]);

  let text = String(markdown ?? '').replace(FENCE_RE, keep).replace(INLINE_CODE_RE, keep);

  // Innermost blocks first, so that a shortcode nested in another one is rendered as well.
  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;

    text = text.replace(blockPattern(), (match, name, args, body) => {
      const render = renderers[name];

      if (!render) return match;

      changed = true;

      return render(parseArgs(args), restore(body));
    });

    if (!changed) break;
  }

  text = text.replace(inlinePattern(), (match, name, args) => {
    const render = renderers[name];

    return render ? render(parseArgs(args), '') : match;
  });

  return restore(text);
}
