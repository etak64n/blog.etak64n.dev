import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeShiki from '@shikijs/rehype';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';

export interface TocItem {
  id: string;
  text: string;
  depth: number;
}

/**
 * Rewrite co-located/relative image URLs.
 * Default base is `/_content/<slug>` (mirrored into static by copy-content-assets.mjs).
 * When R2 + Image Transformations is set up, pass an absolute base to serve optimized images.
 */
function remarkImages(slug: string, base = '/_content') {
  return () => (tree: unknown) => {
    visit(tree as never, 'image', (node: { url: string }) => {
      const url = node.url;
      if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return; // external → leave
      const file = url.replace(/^\.\//, '').replace(/^\//, '');
      node.url = `${base}/${slug}/${file}`;
    });
  };
}

/** Collect h2/h3 headings (after rehype-slug) into `toc`. */
function rehypeCollectToc(toc: TocItem[]) {
  return () => (tree: unknown) => {
    visit(tree as never, 'element', (node: any) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return;
      const id = node.properties?.id;
      if (!id) return;
      const text = extractText(node);
      toc.push({ id, text, depth: node.tagName === 'h2' ? 2 : 3 });
    });
  };
}

function extractText(node: any): string {
  if (node.type === 'text') return node.value;
  if (Array.isArray(node.children)) return node.children.map(extractText).join('');
  return '';
}

export async function renderMarkdown(
  markdown: string,
  slug: string,
  imageBase = '/_content'
): Promise<{ html: string; toc: TocItem[] }> {
  const toc: TocItem[] = [];
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkImages(slug, imageBase))
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeCollectToc(toc))
    .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
    .use(rehypeShiki, { theme: 'nord' })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  return { html: String(file), toc };
}
