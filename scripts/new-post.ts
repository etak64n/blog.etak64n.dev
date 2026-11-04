/**
 * Creates a post: src/content/blog/<slug>/<slug>.md, dated today in Japan time, as a draft.
 *
 *   npm run new -- <slug> [--open]
 *
 * `--open` opens the new file in VS Code with the `code` command.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { POSTS_DIR, slugProblem } from '../src/lib/post-path.ts';
import { newPostText, todayInJapan } from '../src/lib/post-template.ts';

const args = process.argv.slice(2);
const slug = args.find((arg) => !arg.startsWith('--'));
const open = args.includes('--open');

if (!slug) {
  console.error('使い方: npm run new -- <slug> [--open]\n例: npm run new -- cloudflare-workers-architecture');
  process.exit(1);
}

const problem = slugProblem(slug);
if (problem) {
  console.error(problem);
  process.exit(1);
}

const dir = `${POSTS_DIR}/${slug}`;
const file = `${dir}/${slug}.md`;
if (existsSync(dir)) {
  console.error(`${dir} はすでにあります`);
  process.exit(1);
}

mkdirSync(dir, { recursive: true });
writeFileSync(file, newPostText(todayInJapan()), { flag: 'wx' });
console.log(`作成しました: ${file}`);

if (open) {
  const result = spawnSync('code', ['--reuse-window', file], { stdio: 'inherit' });
  if (result.error) console.error('code コマンドが見つかりません。ファイルを直接開いてください。');
}
