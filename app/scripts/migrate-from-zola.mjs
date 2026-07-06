// One-off migration: Zola TOML front matter articles
//   ../../content/articles/<slug>/index.md   (+++ TOML +++)
// -> SvelteKit YAML front matter articles
//   ../src/content/blogPost/<slug>/index.md  (--- YAML ---)
// Also copies co-located image assets.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../../content/articles');
const outRoot = path.resolve(__dirname, '../src/content/blogPost');

const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif', '.mp3', '.mp4', '.m4a']);

/** Very small TOML front-matter parser for this blog's known shape. */
function parseToml(toml) {
  const out = { extra: {} };
  let section = null;
  for (const raw of toml.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line === '[extra]') {
      section = 'extra';
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const valRaw = line.slice(eq + 1).trim();
    const target = section === 'extra' ? out.extra : out;
    if (key === 'taxonomies') {
      const tm = valRaw.match(/tags\s*=\s*\[([^\]]*)\]/);
      target.tags = tm ? parseArray(tm[1]) : [];
      continue;
    }
    target[key] = parseVal(valRaw);
  }
  return out;
}

function parseArray(inner) {
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

function parseVal(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^["']/.test(v)) return v.replace(/^["']|["']$/g, '');
  return v; // dates / numbers kept as raw string
}

function yamlString(s) {
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function yamlTags(tags) {
  return '[' + tags.map(yamlString).join(', ') + ']';
}

async function main() {
  const slugs = await fs.readdir(srcRoot, { withFileTypes: true });
  let n = 0;
  for (const d of slugs) {
    if (!d.isDirectory()) continue;
    const slug = d.name;
    const dir = path.join(srcRoot, slug);
    const mdPath = path.join(dir, 'index.md');
    let raw;
    try {
      raw = await fs.readFile(mdPath, 'utf8');
    } catch {
      continue;
    }
    const m = raw.match(/^\+\+\+\s*\n([\s\S]*?)\n\+\+\+\s*\n?([\s\S]*)$/);
    if (!m) {
      console.warn(`skip (no TOML front matter): ${slug}`);
      continue;
    }
    const fm = parseToml(m[1]);
    const body = m[2];
    const hero = fm.extra?.hero;
    const thumbnail =
      hero && !/placeholder/.test(hero) ? `\n  url: ${yamlString(hero)}` : null;

    const yaml = [
      '---',
      `title: ${yamlString(fm.title ?? slug)}`,
      `slug: ${yamlString(slug)}`,
      `date: ${fm.date ?? ''}`,
      `updated: ${fm.updated ?? fm.date ?? ''}`,
      `draft: ${fm.draft === true}`,
      `description: ${yamlString(fm.description ?? '')}`,
      `tags: ${yamlTags(fm.tags ?? [])}`,
      thumbnail ? `thumbnail:${thumbnail}` : 'thumbnail: null',
      'audio: null',
      'quizzes: []',
      '---',
      ''
    ].join('\n');

    const outDir = path.join(outRoot, slug);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, 'index.md'), yaml + body);

    // copy co-located assets
    for (const f of await fs.readdir(dir)) {
      if (f === 'index.md') continue;
      if (!IMG_EXT.has(path.extname(f).toLowerCase())) continue;
      await fs.copyFile(path.join(dir, f), path.join(outDir, f));
    }
    n++;
    console.log(`migrated: ${slug}`);
  }
  console.log(`\n[migrate] ${n} article(s) -> src/content/blogPost`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
