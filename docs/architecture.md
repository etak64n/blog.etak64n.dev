---
title: blog.etak64n.dev の構成
updated: 2026-10-07
scope: リポジトリ etak64n/blog.etak64n.dev と、その外にある Cloudflare と GitHub の設定
---

# blog.etak64n.dev の構成

blog.etak64n.dev は、リポジトリに置いた Markdown の記事を静的な HTML に変換して配信する技術ブログである。
`main` ブランチに入った変更は、GitHub Actions がビルドし、Cloudflare Pages が配信する。
記事の書き方は [CONTRIBUTING.md](../CONTRIBUTING.md) にある。

## 構成要素

- **Astro**：Markdown の記事とページの部品から HTML を生成する静的サイトジェネレーター。バージョンは 7 系。
- **Sätteri**：Astro 7 が標準で使う、Rust で書かれた Markdown の処理系。Markdown を構文木にし、プラグインで構文木を書き換えてから HTML にする。
- **Expressive Code**：コードブロックを描く Astro の拡張機能。色付け、ファイル名のタブ、コピーボタンを付ける。
- **sharp**：Astro が画像の変換に使う画像処理ライブラリ。
- **GitHub Actions**：push とプルリクエストを受けて、検査、ビルド、デプロイ、通知を実行する。定義は `.github/workflows/deploy.yml`。
- **Cloudflare Pages**：ビルドしたファイルを配信する。プロジェクト名は `etak64n-blog`、本番のブランチは `main`。
- **ゾーン設定**：Cloudflare がドメイン etak64n.dev に持つ設定。応答ヘッダーの書き換え（CSP など）と転送の規則がある。リポジトリの外にあり、`scripts/cloudflare-edge.mjs` が内容を記録している。
- **Discord**：デプロイの結果を受け取る通知先。

## ビルド

`npm run build` は次の順に処理する。

1. **記事の読み込み**：`src/content.config.ts` の `blog` コレクションが、`src/content/blog/` の `.md` と `.mdx` をすべて読む。
   ファイルの場所から slug を決め（`src/lib/post-path.ts`）、`<slug>/<slug>.md` の形でないファイルや、ページの URL と重なる slug はエラーにする。
   フロントマターはスキーマで検査する。未登録のタグ、知らない項目、公開する記事の `description` の欠落はエラーになる。
2. **Markdown の変換**：Sätteri が本文を HTML にする。途中で、[Markdown の処理](#markdown-の処理)のプラグインが構文木を書き換える。
3. **ページの生成**：`src/pages/` の各ページが、記事の一覧から HTML を作る。
4. **画像の生成**：本文の画像と、フロントマターの `hero` の画像を WebP や PNG に変換し、`dist/_astro/` に書き出す。
5. **出力**：`dist/` にサイト全体が揃う。`public/` のファイルはそのまま `dist/` に入る。

変換済みの記事と画像は、キャッシュのディレクトリ `.cache/` に保存される。
次のビルドでは、内容が変わっていない記事と画像を変換し直さない。
このため、記事が増えてもビルドの時間は変更した記事の数で決まる。
Markdown のプラグインは記事のキャッシュの判定に含まれないため、`src/markdown/` を変更したときは手元の `.cache/` を削除してからビルドする。
GitHub Actions のキャッシュは、プラグインとスキーマのファイルの内容をキーに含めるため、これらを変更すると空の状態からビルドする。

## Markdown の処理

Sätteri のプラグインには、Markdown の構文木（mdast）を書き換えるものと、HTML の構文木（hast）を書き換えるものがある。
このブログのプラグインは `src/markdown/` にあり、`astro.config.ts` で次の順に登録している。

| 段階 | プラグイン | 処理 |
| --- | --- | --- |
| mdast | `callouts` | `> [!NOTE]` で始まる引用を、色とアイコンの付いた注記の枠（`<div class="note note-info">`）にする |
| mdast | `quoteSources` | 最後の段落が `出典:` で始まる引用を、`<figure class="quote">` と `<figcaption>` にする |
| mdast | `figures` | 画像で始まる段落を `<figure class="img">` にし、画像の後ろの文を `<figcaption>` にする |
| hast | `externalLinks` | ほかのサイトへのリンクを新しいタブで開く |
| hast | `tableWrappers` | 表を横にスクロールできる `<div class="table-wrap">` で包む |
| hast | `imageSizes` | 記事フォルダーの画像に、幅と `sizes` を指定する |
| hast | Expressive Code | コードブロックを描く |

Astro は、このあとに自身のプラグインで画像を最適化の対象として登録し、見出しの一覧（目次の元）を集める。
注記、引用、図の書き方は、どれも GitHub と VS Code のプレビューで普通の Markdown として読める形にしている。

## 画像

記事フォルダーの画像は、`astro.config.ts` の `image.layout: 'constrained'` によって、`srcset` と `sizes` を持つ画像になる。
`imageSizes` プラグインは、画像ファイルの幅を読み、Astro に渡す幅を次のように決める。

| 元の画像の幅 | 書き出す画像 | `src` |
| --- | --- | --- |
| 1520px より広い | 760px と 1520px | 760px |
| 760px から 1520px | 760px と元の幅 | 元の幅 |
| 760px より狭い | 元の幅 | 元の幅 |

760px は、画面の幅が 1180px 以上のときの本文の幅（`src/site.ts` の `CONTENT_WIDTH`）である。
1520px は、画素密度が 2 倍の画面で本文の幅いっぱいに表示するときに必要な幅である。
`sizes`（`src/site.ts` の `CONTENT_IMAGE_SIZES`）は、画面の幅ごとの本文の幅を表す。本文は、画面が 1180px 以上で 760px、1101px から 1179px で目次の残りの幅、1100px 以下で画面の幅いっぱいになる。ブラウザはこれと画面の画素密度から、2 つのうち必要な方だけを読み込む。
1 枚の画像から書き出すファイルを 2 つまでにしているのは、Cloudflare Pages の無料プランが 1 つのサイトに置けるファイルを 20,000 個までに制限しているためである。

SVG はそのまま 1 ファイルで配信する。
GIF はアニメーションを保ったまま、元の大きさの WebP に変換する。
ほかのサイトの画像（`https://` で始まる URL）は変換せず、`loading="lazy"` だけを付ける。

フロントマターの `hero` の画像は、3 か所に使う。

- 記事の先頭：本文の画像と同じ 2 つの幅で書き出す。
- 記事一覧のカード：1200:630 の比率に切り抜いた幅 800px の WebP。
- リンクのプレビュー（Open Graph）：1200×630 に切り抜いた PNG。

`hero` がない記事は、記事の先頭とカードに `public/images/placeholder.svg` を、リンクのプレビューに `public/og-default.png` を使う。

## URL

| URL | 内容 | ファイル |
| --- | --- | --- |
| `/` | トップページ（最新記事 10 件のカード） | `src/pages/index.astro` |
| `/<slug>/` | 記事 | `src/pages/[slug].astro` |
| `/posts/`、`/posts/<n>/` | 記事一覧（20 件ずつ） | `src/pages/posts/[...page].astro` |
| `/tags/` | タグ一覧 | `src/pages/tags/index.astro` |
| `/tags/<tag>/`、`/tags/<tag>/<n>/` | タグ別の記事一覧 | `src/pages/tags/[tag]/[...page].astro` |
| `/rss.xml` | 新しい 50 件の RSS | `src/pages/rss.xml.ts` |
| `/sitemap.xml` | サイトマップ | `src/pages/sitemap.xml.ts` |
| `/robots.txt` | クローラー向けの指示とサイトマップの場所 | `src/pages/robots.txt.ts` |
| 存在しない URL | 404 ページ（状態コード 404） | `src/pages/404.astro` |

記事の URL はサイトの直下に置く。
サイトのページが使う名前（`posts`、`tags` など）は `src/lib/post-path.ts` の `RESERVED_SLUGS` にあり、記事の slug には使えない。
新しい種類のページを直下に足すときは、その名前を `RESERVED_SLUGS` に加える。

`public/_redirects` は、以前の URL（`/articles/<slug>/`）を新しい URL へ 301 で転送する。

## SEO

すべてのページの `<head>` は `src/layouts/BaseLayout.astro` が作る。

- `<title>`（「記事タイトル | サイト名」）、`description`、canonical URL（`https://blog.etak64n.dev` を基準にした URL）
- Open Graph（`og:title`、`og:description`、`og:image`、`og:url`、記事の公開日と更新日とタグ）と Twitter Card（`summary_large_image`）
- JSON-LD：トップページは `WebSite`、記事は `BlogPosting`（見出し、説明、公開日、更新日、著者、画像、キーワード）
- 下書きと 404 ページには `noindex`

サイトマップの `lastmod` は、記事の `updated`（なければ `date`）である。

## 下書き

`draft: true` の記事は、次のときだけ一覧と記事ページに含まれる（`src/lib/posts.ts` の `showDrafts`）。

- 開発サーバー（`npm run dev`）
- 環境変数 `SHOW_DRAFTS=true` を付けたビルド。GitHub Actions はプルリクエストのビルドにこれを付ける。

`SHOW_DRAFTS` は `astro.config.ts` の `env.schema` で、真偽値の環境変数として定義している。

## デプロイ

`.github/workflows/deploy.yml` は 3 つのジョブからなる。

1. **build**：`npm ci`、キャッシュの復元、`npm run check`（TypeScript とフロントマターの検査）、`npm run build`。
2. **deploy**：`wrangler pages deploy` で `dist/` を Cloudflare Pages に送る。`--branch` に Git のブランチ名を渡すため、`main` は本番、それ以外はプレビュー（`https://<ブランチ名>.etak64n-blog.pages.dev/`）になる。
3. **notify**：結果と公開先の URL を Discord に送る。

ワークフローは GitHub の Secrets の `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`DISCORD_WEBHOOK_URL` を使う。
フォークからのプルリクエストは Secrets を使えないため、ビルドだけを実行する。

`wrangler.toml` は Pages プロジェクトの名前と出力先を記録している。
サイトは静的なファイルだけで構成され、Pages Functions もバインディングも持たない。

## Cloudflare の設定

- **DNS**：`blog.etak64n.dev` は `etak64n-blog.pages.dev` を指す CNAME で、Cloudflare のプロキシを通る。
- **応答ヘッダー**：ゾーンの Transform Rule が、`blog.etak64n.dev` の応答に CSP と Permissions-Policy を付ける。CSP が許す読み込み元は、スクリプトが同じオリジン、インライン、jsDelivr、Cloudflare Web Analytics、スタイルが同じオリジン、インライン、jsDelivr、画像が同じオリジン、`data:`、`https:` である。サイトが読み込むスクリプトとスタイルは、Web Analytics を除いてすべて同じオリジンかインラインにある。`scripts/cloudflare-edge.mjs` が規則の内容を持ち、差分の表示と反映を行う。
- **キャッシュのヘッダー**：`public/_headers` が、ファイル名に内容のハッシュを含む `/_astro/*` に 1 年間の `immutable` を付ける。
- **pages.dev の転送**：一括転送（Bulk Redirects）が、本番の `etak64n-blog.pages.dev` を `https://blog.etak64n.dev` へ 301 で転送する。プレビューのサブドメインは転送しない。
- **Web Analytics**：Cloudflare がゾーンの設定により、配信時にページへ計測用のスクリプトを挿入する。

## 機能を足すとき

- **全文検索**：[Pagefind](https://pagefind.app/) は、ビルド後の `dist/` から検索用の索引を作り、静的なファイルだけで検索を提供する。`npm run build` の後に `pagefind --site dist` を実行し、検索ページを足す。Pagefind は WebAssembly を使うため、CSP の `script-src` に `'wasm-unsafe-eval'` を加える必要がある。
- **シリーズ記事**：フロントマターに `series` を足し、タグと同じように `src/` に登録制の一覧を置くと、表記の揺れを防げる。
- **OG 画像の自動生成**：タイトルを描いた画像を記事ごとに作る場合は、ビルド時に SVG から PNG を作るエンドポイント（`src/pages/og/[slug].png.ts`）を足す。日本語のフォントファイルが必要になる。
- **コメント**：GitHub Discussions を使う giscus などは iframe で表示するため、CSP の `frame-src` に配信元を加える必要がある。
- **人気記事**：Cloudflare Web Analytics の GraphQL API から閲覧数を取得し、ビルド時に順位を作る。
