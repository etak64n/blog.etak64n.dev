// Copy co-located article assets (images etc.) from src/content/blogPost/<slug>/*
// into static/_content/<slug>/* so they can be served at /_content/<slug>/<file>.
// Method 3b: originals stay in Git (src/content); this only mirrors them into the
// static output for local/prerender delivery. Later, a CI step can mirror the same
// files to R2 and the markdown image plugin can rewrite to the Transformations URL.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(__dirname, '../src/content/blogPost');
const outRoot = path.resolve(__dirname, '../static/_content');

const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif', '.mp3', '.mp4', '.m4a']);

async function walk(dir, cb) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, cb);
    else await cb(full);
  }
}

async function main() {
  await fs.rm(outRoot, { recursive: true, force: true });
  let count = 0;
  await walk(contentRoot, async (file) => {
    const ext = path.extname(file).toLowerCase();
    if (!IMG_EXT.has(ext)) return;
    const rel = path.relative(contentRoot, file); // <slug>/<file>
    const dest = path.join(outRoot, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(file, dest);
    count++;
  });
  console.log(`[copy-content-assets] copied ${count} asset(s) -> static/_content`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
