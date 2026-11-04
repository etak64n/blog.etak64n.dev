/**
 * The text a new post starts with, shared by `npm run new` (scripts/new-post.ts) and the editor at
 * /admin/ (src/admin/), so that posts start the same way wherever they are written. The script runs
 * this file with Node.js directly, so this module must not import anything.
 */

/** Today's date in Japan time, as `YYYY-MM-DD`. */
export function todayInJapan(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

/** A new post dated `date` (`YYYY-MM-DD`), as a draft. */
export function newPostText(date: string): string {
  return `---
title: タイトル
description: ""
date: ${date}
tags: []
draft: true
---

## はじめに

## 参考資料

- [ページのタイトル](https://example.com/)
`;
}
