---
title: "Sveltia CMS でブログを書いてみるテスト"
slug: "hello-sveltia-cms"
date: 2026-07-02
updated: 2026-07-02
draft: false
description: ""
tags: ["Sveltia CMS", "Zola", "Cloudflare Pages", "テスト"]
thumbnail: null
audio: null
quizzes: []
---
## はじめに

この記事は、[Zola](https://www.getzola.org/) + [Sveltia CMS](https://sveltiacms.app/) +
Cloudflare Pages で構築したブログの、投稿フローを確認するためのテスト記事です。

## 構成

このブログは次の要素で成り立っています。

- **Zola** — 静的サイトジェネレーター。Markdown から HTML を生成します。
- **Sveltia CMS** — Git ベースの管理画面。`/admin/` から記事を編集します。
- **GitHub** — 記事の保存先。編集内容はコミットとして記録されます。
- **Cloudflare Pages** — ホスティング。`main` への push で自動デプロイされます。

## 投稿の流れ

1. `/admin/` にアクセスして GitHub でログイン
2. 記事を書いて保存 → GitHub にコミットされる
3. GitHub Actions がビルドして Cloudflare Pages へデプロイ
4. 数分以内に本番へ反映

## おわりに

この記事が本番サイトに表示されていれば、投稿フローは正常に動作しています。
不要になったら削除して問題ありません。
