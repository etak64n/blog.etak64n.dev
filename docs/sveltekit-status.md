# SvelteKit 移行 — 進捗と引き継ぎ

ブランチ: **`feat/sveltekit`**（`main` / 本番 blog.etak64n.dev には未反映・無影響）
アプリ: **`app/`**（SvelteKit 2 + Svelte 5 + adapter-cloudflare）

## 🌐 ライブプレビュー（本番とは別プロジェクト）

**https://etak64n-blog-sveltekit.pages.dev**

Cloudflare Pages の**新規プロジェクト** `etak64n-blog-sveltekit` にデプロイ済み。
本番 `etak64n-blog` / `blog.etak64n.dev` には一切影響していません（別プロジェクト・別URL）。
全ページ 200、クイズ・コードハイライト(shiki)・sitemap/RSS 動作確認済み。

## ✅ 実装済み（ローカルで `npm run build` 通過）

- SvelteKit + adapter-cloudflare + Tailwind の土台
- Markdown パイプライン（remark/rehype + **shiki** ハイライト + slug/autolink + TOC 抽出）
- コンテンツローダ（`import.meta.glob`、**YAML frontmatter** スキーマ、draft 除外、日付降順）
- ルート: `/`（最新）・`/articles/`（一覧）・`/articles/[slug]/`（詳細）・`/tags/`・`/tags/[tag]/`
- **クイズ機能**（`Quiz.svelte`：選択→正誤→解説、やり直し）
- サムネイル・概要(description)・OGP メタ
- **sitemap.xml / rss.xml**（prerender 生成）
- 全ページ prerender（静的出力、Cloudflare Pages 向け）
- 既存 7 記事を Zola(TOML)→ YAML へ移行（`app/scripts/migrate-from-zola.mjs`）
- Sveltia CMS 設定を新スキーマ・新配置へ更新（`app/static/admin/`）

> 注: クイズ/ハイライト検証用に他サイト記事を丸写ししたデモ記事を一時作成・デプロイしてしまい、
> 撤去済み（記事削除・Pages プロジェクト削除）。クイズ機能の確認は自作のダミー記事で行うこと。
- 手動デプロイ workflow（`.github/workflows/deploy-sveltekit.yml`、`workflow_dispatch` のみ）

## ローカルでの動かし方

```sh
cd app
npm install
npm run dev      # 開発サーバ（draft も表示される）
npm run build    # 本番ビルド（prerender、draft 除外）
npm run preview  # ビルド結果をプレビュー
```

## コンテンツ構造

```
app/src/content/blogPost/<slug>/
  index.md        # YAML frontmatter + 本文
  <image>.png     # co-located 画像（原本＝Git、method 3b）
```

frontmatter スキーマ:

```yaml
---
title: "…"
slug: "…"
date: 2024-07-28
updated: 2024-07-28
draft: false
description: "一覧/OGP/検索用の概要"
tags: ["CSS"]
thumbnail: { url: "…", title: "…" }   # or null
audio: null
quizzes:
  - question: "…"
    answers:
      - { text: "…", correct: true, explanation: "…" }
---
本文（Markdown）
```

## 🔲 残タスク（あなたの Cloudflare 操作が必要な部分）

### 1. 画像 R2 + Transformations（method 3b）
現状: 画像は co-located 原本を `static/_content` にミラーして配信（`copy-content-assets.mjs`）。**これで今も表示は動く。**
R2 に載せる場合:
- [ ] R2 バケット作成、公開カスタムドメイン `images.etak64n.dev` を設定
- [ ] Image Transformations をゾーンで有効化
- [ ] GitHub Actions に R2 書き込みトークン + 画像ミラー step を追加（原本は Git に残す）
- [ ] Pages/Actions の変数 `IMAGES_BASE` を Transformations prefix に設定すると本文/サムネ画像が最適化配信に切替
      例: `https://blog.etak64n.dev/cdn-cgi/image/format=auto,width=1200/https://images.etak64n.dev`
      （`app/src/lib/config.ts` と `articles/[slug]/+page.server.ts` が対応済み）

### 2. 多言語（i18n）
- [ ] Paraglide (inlang) 導入（UI 文言）
- [ ] `[[lang]]` ルーティング + ロケール別コンテンツ（`index.md` / `index.en.md` 等）
- 現状は ja のみ。構造は後付け可能な形で用意済み。

### 3. デプロイ & 切替
- [x] `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` はリポジトリ secret に設定済み（流用可）
- [x] **新規プレビュー用プロジェクト** `etak64n-blog-sveltekit` を作成・デプロイ済み → https://etak64n-blog-sveltekit.pages.dev
- [x] プレビューURLで動作確認（全ページ 200 / クイズ / shiki / sitemap / rss）
- [ ] （あなた）プレビューを実際に見て内容を確認
- [ ] （あなた）問題なければ独自ドメイン `blog.etak64n.dev` を新プロジェクトへ付け替え（旧 Zola はロールバック用に温存）
- [ ] `/admin` の CSP Transform Rule は既存を流用（jsdelivr 許可済み）
- 手動再デプロイ: `cd app && npm run build && npx wrangler pages deploy .svelte-kit/cloudflare --project-name=etak64n-blog-sveltekit`
  もしくは Actions の **Deploy SvelteKit**（workflow_dispatch）

### 4. 仕上げ（任意）
- [ ] Pagefind 検索、関連記事（タグ一致）、ダークモード切替ボタン、404 ページの整備
- [ ] 旧 URL（`/articles/{slug}/` は維持済みなので基本不要。変える場合のみ 301）
- [ ] 移行完了後、ルートの Zola 資産（`config.toml`, `content/`, `templates/`, `sass/`, `deploy.yml`）を撤去

## 適用した既定の判断

- 言語: ja（en は後付け）/ URL: `/articles/{slug}/` 維持 / ファイル名: slug フォルダ
- プロジェクト形態: 現リポジトリの `app/` に SvelteKit（モノレポ風）/ 切替は段階（プレビュー→ドメイン付替）
- 画像編集方式: **3b**（原本 Git + R2 ミラー）

## 安全メモ

- 本作業は **`feat/sveltekit` ブランチのみ**。`main` と本番デプロイには一切触れていない。
- PR も未作成（PR を作ると既存 deploy.yml が発火するため、切替準備が整うまで作らないこと）。
