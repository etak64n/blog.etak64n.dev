/**
 * Entry point of the blog-specific Sveltia CMS extensions.
 *
 * Loaded as an ES module after the pinned Sveltia CMS bundle (see index.html), which exposes
 * the global `CMS` object plus `h` / `createClass` for React components without a build step.
 */
import { registerEditorComponents } from './editor-components.js';
import { registerHeroField } from './hero-field.js';
import { registerPreviewTemplate } from './preview-template.js';

// The preview pane is an iframe: give it the site's stylesheet plus a few preview-only rules.
CMS.registerPreviewStyle('/main.css');
// Theme for the highlight.js output used by the preview template (loaded from jsDelivr).
CMS.registerPreviewStyle('https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github-dark.min.css');
CMS.registerPreviewStyle('/admin/preview.css');

registerEditorComponents();
registerPreviewTemplate();
registerHeroField();

// `?backend=test` swaps in the in-browser Test backend for local development without GitHub.
const params = new URLSearchParams(location.search);
const config = params.get('backend') === 'test' ? { backend: { name: 'test-repo' } } : undefined;

CMS.init(config ? { config } : undefined);
