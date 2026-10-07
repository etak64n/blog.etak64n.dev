/**
 * HTML-level (hast) plugins for Sätteri, Astro's Markdown processor. They run before Astro's own
 * image and heading-id plugins. See docs/architecture.md for the list.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { imageMetadata } from 'astro/assets/utils';
import { defineHastPlugin } from 'satteri';
import { CONTENT_WIDTH, SITE } from '../site.ts';

/**
 * A `#` link after each heading, pointing at the heading's id. The ids come from Astro's heading-id
 * plugin, which must run first. The link has no text, so tables of contents keep the heading text.
 */
export const headingAnchors = defineHastPlugin({
  name: 'blog-heading-anchors',
  element: {
    filter: ['h2', 'h3', 'h4', 'h5', 'h6'],
    visit(node, ctx) {
      const id = node.properties.id;
      if (typeof id !== 'string' || !id) return;
      ctx.appendChild(node, {
        type: 'element',
        tagName: 'a',
        properties: { className: ['heading-anchor'], href: `#${id}`, ariaHidden: 'true', tabIndex: -1 },
        children: [],
      });
    },
  },
});

const SITE_HOST = new URL(SITE.url).host;

/** Links to other sites open in a new tab. */
export const externalLinks = defineHastPlugin({
  name: 'blog-external-links',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = node.properties.href;
      if (typeof href !== 'string' || !URL.canParse(href)) return;
      const url = new URL(href);
      if (!url.protocol.startsWith('http') || url.host === SITE_HOST) return;
      ctx.setProperty(node, 'target', '_blank');
      ctx.setProperty(node, 'rel', ['noopener', 'noreferrer']);
    },
  },
});

/** Tables scroll sideways inside a wrapper instead of widening the page. */
export const tableWrappers = defineHastPlugin({
  name: 'blog-table-wrappers',
  element: {
    filter: ['table'],
    visit(node, ctx) {
      ctx.wrapNode(node, {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrap'] },
        children: [],
      });
    },
  },
});

/**
 * Sizes images stored next to a post for the article column. Astro then writes each one at most
 * twice: at the column width and at twice it, for high-density screens (`image.breakpoints` in
 * astro.config.ts). Larger originals are scaled down; smaller ones are kept at their own size.
 *
 * - `width` is the image's own width, or the column width when the image is more than twice as wide.
 * - `sizes` tells the browser the image is never shown wider than the column.
 * - SVG and GIF files are written once as they are (`layout: none`): SVGs scale themselves, and GIF
 *   animations become a single animated WebP.
 *
 * Images from other sites and from public/ are not processed; they only load lazily.
 */
export const imageSizes = defineHastPlugin({
  name: 'blog-image-sizes',
  element: {
    filter: ['img'],
    async visit(node, ctx) {
      const src = node.properties.src;
      const postURL = ctx.fileURL;
      if (typeof src !== 'string') return;
      if (URL.canParse(src) || src.startsWith('/') || !postURL) {
        ctx.setProperty(node, 'loading', 'lazy');
        ctx.setProperty(node, 'decoding', 'async');
        return;
      }
      const data = await readFile(new URL(decodeURI(src), postURL)).catch(() => {
        throw new Error(`画像が見つかりません: ${src}（${fileURLToPath(postURL)}）`);
      });
      const { width, format } = await imageMetadata(data, src);
      if (format === 'svg' || format === 'gif') {
        ctx.setProperty(node, 'layout', 'none');
        return;
      }
      ctx.setProperty(node, 'width', width > CONTENT_WIDTH * 2 ? CONTENT_WIDTH : width);
      ctx.setProperty(node, 'sizes', `(min-width: ${CONTENT_WIDTH + 48}px) ${CONTENT_WIDTH}px, 100vw`);
    },
  },
});
