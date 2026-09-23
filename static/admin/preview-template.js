/**
 * Preview template for the `articles` collection.
 *
 * Mirrors `templates/articles/single.html`: hero image, title, date, tags and the body. The body
 * Markdown is converted with the `marked` + `DOMPurify` pair that Sveltia CMS exposes, after the
 * Zola shortcodes have been turned into HTML, so `{% ref %}`, `{{ img() }}` and friends look like
 * they do on the site. Co-located images are resolved with `getAsset`, code is highlighted with
 * highlight.js loaded from jsDelivr (optional: the preview still works if it fails to load).
 *
 * `CMS.renderRichText()` is deliberately not used here: in 0.218 it expects the entry draft
 * context of an editor component and throws when called from a preview template.
 */
import { transformShortcodes } from './shortcodes.js';

const PLACEHOLDER = '/images/hero/placeholder.svg';
const HLJS_URL = 'https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/lib/common/+esm';
// Same version as templates/base.html; its stylesheet is registered in cms.js.
const KATEX_AUTO_RENDER_URL = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.mjs';
/** The site's delimiters (templates/base.html): no single `$`, which marks hexadecimal numbers. */
const MATH_DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '\\(', right: '\\)', display: false },
  { left: '\\[', right: '\\]', display: true },
];

// Loaded once, lazily; `null` when the CDN is unreachable or blocked.
let hljsPromise;

const loadHighlighter = () => {
  hljsPromise ??= import(HLJS_URL)
    .then((module) => module.default ?? module)
    .catch((error) => {
      console.warn('[preview] highlight.js could not be loaded; code is shown unhighlighted', error);

      return null;
    });

  return hljsPromise;
};

const toArray = (value) => {
  if (!value) return [];
  if (typeof value.toJS === 'function') return value.toJS();

  return Array.isArray(value) ? value : [value];
};

const isExternal = (path) => /^(https?:|data:|blob:|\/\/)/.test(path);

/** Turn the stored hero path into something the preview iframe can load. */
function resolveHero(value, getAsset) {
  if (!value) return PLACEHOLDER;
  if (isExternal(value)) return value;

  try {
    const asset = getAsset?.(value);

    if (asset?.url) return asset.url;
  } catch {
    // Fall through: the path is served by the site itself.
  }

  return value;
}

/** Replace co-located / uploaded image paths with the blob URLs the CMS holds for them. */
function resolveImages(root, getAsset) {
  if (typeof getAsset !== 'function') return;

  root.querySelectorAll('img[src]').forEach((image) => {
    const src = image.getAttribute('src') ?? '';

    if (!src || isExternal(src)) return;

    try {
      const asset = getAsset(src);

      if (asset?.url) image.src = asset.url;
    } catch {
      // Keep the original path; the site may serve it.
    }
  });
}

const FAVICONS = '.link-card-favicon, .ref-trigger-icon, .ref-panel-icon';

/**
 * Like the script in templates/base.html on the site: favicons show a globe (a CSS background
 * in main.css) until they have loaded, then `.is-loaded` removes it.
 */
function markLoadedFavicons(root) {
  root.querySelectorAll(FAVICONS).forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('is-loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    }
  });
}

/** Apply the `{{ img() }}` options that Markdown alone cannot express. */
function applyImageOptions(root) {
  root.querySelectorAll('figure.img').forEach((figure) => {
    const image = figure.querySelector('img');

    if (!image) return;

    const percent = Number.parseFloat(figure.dataset.percent);

    if (percent > 0 && percent <= 1) image.style.width = `${Math.round(percent * 100)}%`;
    if (figure.dataset.imgClass) image.className = figure.dataset.imgClass;
    if (figure.dataset.imgStyle) image.style.cssText += `;${figure.dataset.imgStyle}`;
  });
}

/** Code that templates/shortcodes/code.html leaves plain because it looks like a shortcode call. */
const SHORTCODE_LIKE = /\{[{%]\s*[A-Za-z_][A-Za-z0-9_]*\s*\(|\{%\s*end\s*%\}/;

let autoRenderPromise;

/** Render the formulas of an article that enables math (`extra.math`), like the site does. */
async function renderMath(root) {
  autoRenderPromise ??= import(KATEX_AUTO_RENDER_URL)
    .then((module) => module.default)
    .catch((error) => {
      console.warn('[preview] KaTeX could not be loaded; formulas are shown as text', error);

      return null;
    });

  const renderMathInElement = await autoRenderPromise;

  if (!renderMathInElement || !root.isConnected) return;

  renderMathInElement(root, { delimiters: MATH_DELIMITERS, throwOnError: false });
}

async function highlightCode(root) {
  // Colour what Zola colours at build time: code with a language, except in light-theme code
  // boxes and in code boxes whose code looks like a shortcode call.
  const blocks = [...root.querySelectorAll('pre code')].filter((block) => {
    if (!/\blanguage-/.test(block.className)) return false;

    const box = block.closest('.codebox');

    return !box || (box.classList.contains('dark') && !SHORTCODE_LIKE.test(block.textContent));
  });

  if (!blocks.length) return;

  const hljs = await loadHighlighter();

  if (!hljs || !root.isConnected) return;

  blocks.forEach((block) => {
    try {
      hljs.highlightElement(block);
    } catch {
      // Unknown language etc.: leave the block as plain text.
    }
  });
}

/**
 * URLs DOMPurify may keep. Its default list drops `blob:`, which images pasted into the body use
 * until the entry is saved; this is the list Sveltia CMS uses for its own preview.
 */
const SAFE_URI = /^(?:(?:(?:f|ht)tps?|mailto|tel|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

/** Markdown → sanitized HTML with the CMS-provided parser, matching the site's newline handling. */
function renderMarkdown(markdown) {
  // `breaks: false` like Zola; the site's `.content p { white-space: pre-line }` shows newlines.
  const html = marked.parse(transformShortcodes(markdown), { gfm: true, breaks: false });

  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'], ALLOWED_URI_REGEXP: SAFE_URI });
}

const ArticlePreview = createClass({
  componentDidMount: function () {
    this.renderBody();
  },

  componentDidUpdate: function () {
    this.renderBody();
  },

  /** Re-render the body only when its Markdown or its container changed. */
  renderBody: function () {
    const element = this.bodyElement;

    if (!element) return;

    const markdown = this.props.entry.getIn(['data', 'body']) || '';
    const math = this.props.entry.getIn(['data', 'extra', 'math']) === true;

    if (element === this.renderedElement && markdown === this.renderedMarkdown && math === this.renderedMath) return;

    this.renderedElement = element;
    this.renderedMarkdown = markdown;
    this.renderedMath = math;

    try {
      element.innerHTML = renderMarkdown(markdown);
    } catch (error) {
      console.error('[preview] failed to render the body', error);
      element.textContent = markdown;

      return;
    }

    resolveImages(element, this.props.getAsset);
    applyImageOptions(element);
    markLoadedFavicons(element);
    highlightCode(element);

    if (math) renderMath(element);
  },

  render: function () {
    const { entry, getAsset } = this.props;
    const title = entry.getIn(['data', 'title']) || '';
    const date = entry.getIn(['data', 'date']) || '';
    const tags = toArray(entry.getIn(['data', 'taxonomies', 'tags']));
    const hero = resolveHero(entry.getIn(['data', 'extra', 'hero']), getAsset);

    return h(
      'div',
      { className: 'wrap' },
      h(
        'div',
        { className: 'page-body no-toc' },
        h(
          'article',
          { className: 'post-col' },
          h('div', { className: 'post-hero' }, h('img', { src: hero, alt: title })),
          h('h1', {}, title),
          h('p', { className: 'post-meta' }, String(date)),
          tags.length
            ? h(
                'p',
                { className: 'tax' },
                tags.map((tag, index) => h('span', { className: 'pill tag', key: index }, `#${tag}`)),
              )
            : null,
          h('div', {
            className: 'content',
            ref: (node) => {
              this.bodyElement = node;
            },
          }),
        ),
      ),
    );
  },
});

export function registerPreviewTemplate() {
  CMS.registerPreviewTemplate('articles', ArticlePreview);
}
