import { defineConfig, envField } from 'astro/config';
import { satteri, satteriHeadingIdsPlugin } from '@astrojs/markdown-satteri';
import mdx from '@astrojs/mdx';
import expressiveCode from 'astro-expressive-code';
import { CONTENT_WIDTH, SITE } from './src/site.ts';
import { callouts, figures, quoteSources } from './src/markdown/mdast.ts';
import { externalLinks, headingAnchors, imageSizes, tableWrappers } from './src/markdown/hast.ts';

export default defineConfig({
  site: SITE.url,
  // Outside node_modules so that `npm ci` keeps it; CI restores it between builds.
  cacheDir: './.cache',
  image: {
    // Markdown images get srcset/sizes; src/markdown/hast.ts limits them to these two widths.
    layout: 'constrained',
    breakpoints: [CONTENT_WIDTH, CONTENT_WIDTH * 2],
  },
  markdown: {
    processor: satteri({
      features: {
        gfm: {
          footnotes: { label: '脚注', backLabel: '本文の脚注 {reference} の位置に戻る' },
        },
        // Keep `--flag`, "quotes" and `...` as written.
        smartPunctuation: false,
      },
      mdastPlugins: [callouts, quoteSources, figures],
      // Expressive Code (code blocks) appends its own plugin after these.
      hastPlugins: [satteriHeadingIdsPlugin(), headingAnchors, externalLinks, tableWrappers, imageSizes],
    }),
  },
  // Expressive Code reads its settings from ec.config.mjs and must come before MDX.
  integrations: [expressiveCode(), mdx()],
  env: {
    schema: {
      SHOW_DRAFTS: envField.boolean({ context: 'server', access: 'public', default: false }),
    },
  },
  experimental: {
    // JSON schemas for front matter completion in VS Code (setting `astro.content-intellisense`).
    contentIntellisense: true,
  },
});
