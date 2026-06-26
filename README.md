# etak64n-blog

Blog built with Zola + Tera and deployed to Cloudflare Pages via GitHub Actions.

Highlights
- Grid cards for Latest/Indexes (large thumbnail + title + date)
- Sticky Table of Contents (ToC) on the left of article pages
- Hero image support (fallback placeholder when not provided)
- Tags/Categories (taxonomies), related posts generated at build time by tag match
- Feeds disabled by default (can be enabled later)

## Requirements
- Zola — install: https://www.getzola.org/documentation/getting-started/installation/

## Local development
- Start dev server: `zola serve` → http://127.0.0.1:1111/
- Build for production: `zola build` → output in `public/`

## Project structure (excerpt)
- `content/articles/` — posts section (category/slug/index.md + assets)
- `templates/` — Tera templates
  - `templates/base.html` — shared layout
  - `templates/index.html` — Home (latest posts)
  - `templates/articles/list.html` — Articles index
  - `templates/articles/single.html` — Article page
  - `templates/taxonomy_list.html`, `templates/taxonomy_single.html` — Tags/Categories
- `sass/main.scss` — site styles (compiled to `main.css`)
- `static/images/` — images served under `/images/...`

## Writing posts
Create a directory under `content/articles/<Category>/<slug>/` and add an `index.md` (plus any images/assets) there.
Year/month folders are no longer needed; the category name becomes part of the output path.
Use one of the existing category folders (`Cloudflare`, `Security`, etc.), or create a new folder and drop a minimal `_index.md` like:
```toml
+++
title = "YourCategory"
transparent = true
+++
```
This keeps the category section transparent so the article still appears in the top-level Articles listing.

Front matter example (TOML):
```toml
+++
title = "Title"
date = 2025-09-01
updated = 2025-09-01
draft = true
taxonomies = { tags=["AWS","QuickSight"], categories=["Analytics"] }
[extra]
hero = "/images/your-hero.svg"  # optional; placeholder used if omitted
toc = true                       # enable ToC
+++

Body...
```

Notes
- Place hero images under `static/images/` and reference via `/images/...`.
- The ToC is generated automatically from headings (##, ###, ...).
- Related posts are computed at build time by tag overlap (tweakable in template).

## Taxonomies (Tags/Categories)
- Configured in `config.toml` via `[[taxonomies]]` blocks for `tags` and `categories`.
- Term pages render as a responsive card grid.

## Content management (Sveltia CMS)

記事の作成・編集は **[Sveltia CMS](https://sveltiacms.app/)**（Git ベースのヘッドレス CMS）で行う。
ブラウザの管理画面 `https://blog.etak64n.dev/admin/` から GitHub にログインし、編集内容は
リポジトリへのコミットとして保存される（コミット＝GitHub Actions が走り Cloudflare Pages へ反映）。

CMS 本体は CDN から読み込むだけでビルド不要:
- `static/admin/index.html` — 管理画面のエントリ（`@sveltia/cms` を CDN ロード）
- `static/admin/config.yml` — コレクション定義（カテゴリごとに 1 コレクション）

### 記事フォーマットとの対応
- 各記事は `content/articles/{Category}/{slug}/index.md`（page bundle）として保存される。
- 本文中の画像は **記事フォルダに co-located** でアップロードされる（`media_folder: ""`）。
  挿入される Markdown は `![](foo.png)`。レスポンシブ表示が必要なら `{{ img(src="foo.png") }}` shortcode に書き換える。
- frontmatter は Zola 互換の TOML（`format: toml-frontmatter`）。`taxonomies` / `[extra]` も CMS から編集可能。
- **既存記事を CMS で再保存すると frontmatter が正規化される**（インライン `taxonomies = {…}` が `[taxonomies]` テーブルになる等）。意味は同じだが差分が出る点に注意。
- 新しいカテゴリを追加したら `static/admin/config.yml` にコレクションブロックを 1 つ追記する
  （`name` を ASCII、`folder` を `content/articles/<新カテゴリ>`、`taxonomies.categories` の `default` を新カテゴリ名にする）。

### ログイン認証（OAuth Worker）のセットアップ
Sveltia CMS は GitHub OAuth でログインする。OAuth の secret 交換用に
**[sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth)** を Cloudflare Workers にデプロイする（初回のみ）。

1. `sveltia/sveltia-cms-auth` を Cloudflare Workers にデプロイ → Worker URL を控える
   （例: `https://sveltia-cms-auth.<subdomain>.workers.dev`）。
2. GitHub で OAuth App を登録（Settings → Developer settings → OAuth Apps → New）:
   - **Authorization callback URL**: `<WORKER_URL>/callback`
   - Client ID と Client Secret を発行。
3. Worker に環境変数を設定（Cloudflare ダッシュボード → Worker → Settings → Variables）:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`（Encrypt して保存）
   - `ALLOWED_DOMAINS = blog.etak64n.dev`
4. `static/admin/config.yml` の `backend.base_url` を Worker URL に書き換える
   （現状は `https://sveltia-cms-auth.CHANGE-ME.workers.dev` のプレースホルダ）。

> 単一ユーザーで手早く済ませたい場合は、OAuth Worker の代わりに GitHub Personal Access Token を
> ログイン時に貼り付ける運用も可能（`base_url` 不要）。ただし端末ごとにトークン管理が必要。

### ローカルでの動作確認
Sveltia はプロキシサーバ不要。Chromium 系ブラウザのファイルシステムアクセスでローカルリポジトリを直接編集する:
1. `zola build`（`static/admin/` を `public/admin/` に出力させる）してから `wrangler pages dev public`、
   もしくは任意の静的サーバで `public/` を配信する。
2. Chrome/Edge で `http://localhost:8788/admin/` を開く。
3. 「Work with Local Repository」を選び、このリポジトリのフォルダへのアクセスを許可する。
4. 編集 → 保存はローカルファイルに反映される（コミットは手動）。

## Deployment (Cloudflare Pages)
- Build command: `zola build -u "${CF_PAGES_URL:-https://blog.etak64n.dev/}"`
  - Output directory: `public`
  - Direct upload via Wrangler: `wrangler pages deploy public`

Notes
- Feeds are currently disabled (`generate_feeds = false`). Turn on and add a header link if you need them.
- `wrangler.toml` is for Pages Direct Upload/Workers. If you only use Pages (GitHub integration), it may remain unused.
- If a preview shows old styles, view page source and check the `main.css` URL domain. It should be the preview domain when using the build command above.
