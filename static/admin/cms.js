/**
 * Entry point of the blog-specific Sveltia CMS extensions.
 *
 * Loaded as an ES module after the pinned Sveltia CMS bundle (see index.html), which exposes
 * the global `CMS` object plus `h` / `createClass` for React components without a build step.
 */
// Must run first: adapts the preview pane to the /admin Content-Security-Policy.
import './csp-compat.js';
import { registerBodyEditor } from './body-editor.js';
import { registerEditorComponents } from './editor-components.js';
import { registerHeroField } from './hero-field.js';
import { registerPreviewTemplate } from './preview-template.js';

// The preview pane is an iframe: give it the site's stylesheet plus a few preview-only rules.
CMS.registerPreviewStyle('/main.css');
// Theme for the highlight.js output used by the preview template (loaded from jsDelivr): Nord,
// the theme Zola uses for the site's code (config.toml).
CMS.registerPreviewStyle('https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/nord.min.css');
CMS.registerPreviewStyle('/admin/preview.css');

// Used by the built-in Markdown widget only, i.e. if `body` is switched back to `widget: markdown`.
registerEditorComponents();
registerPreviewTemplate();
registerHeroField();
registerBodyEditor();

// `?backend=test` swaps in the in-browser Test backend for local development without GitHub.
const params = new URLSearchParams(location.search);
const config = params.get('backend') === 'test' ? { backend: { name: 'test-repo' } } : undefined;

CMS.init(config ? { config } : undefined);
