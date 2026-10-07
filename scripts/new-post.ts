/**
 * Creates a post: src/content/blog/<slug>/<slug>.md, dated today in Japan time, as a draft.
 *
 *   npm run new -- <slug> [--open]
 *
 * `--open` opens the new file in VS Code with the `code` command.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { slugProblem } from '../src/lib/post-path.ts';

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

const dir = `src/content/blog/${slug}`;
const file = `${dir}/${slug}.md`;
if (existsSync(dir)) {
  console.error(`${dir} はすでにあります`);
  process.exit(1);
}

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());

const template = `---
title: タイトル
description: ""
date: ${today}
tags: []
draft: true
---

## はじめに

## 参考資料

- [ページのタイトル](https://example.com/)
`;

mkdirSync(dir, { recursive: true });
writeFileSync(file, template, { flag: 'wx' });
console.log(`作成しました: ${file}`);

if (open) {
  const result = spawnSync('code', ['--reuse-window', file], { stdio: 'inherit' });
  if (result.error) console.error('code コマンドが見つかりません。ファイルを直接開いてください。');
}
