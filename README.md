# blog.etak64n.dev

[blog.etak64n.dev](https://blog.etak64n.dev) のソースである。
記事は Markdown ファイルで、[Astro](https://astro.build/) が静的な HTML に変換し、[Cloudflare Pages](https://developers.cloudflare.com/pages/) が配信する。

## 仕組み

記事は、記事ごとのフォルダーに、画像と一緒に置かれる。

```text
src/content/blog/
  cloudflare-workers-architecture/
    cloudflare-workers-architecture.md   → https://blog.etak64n.dev/cloudflare-workers-architecture/
    architecture.png
```

`main` ブランチへの push を受けて、GitHub Actions がサイトをビルドし、Cloudflare Pages に公開する。

```text
VS Code で記事を書く → git push → GitHub Actions（型とフロントマターの検査、ビルド、画像の最適化）→ Cloudflare Pages → blog.etak64n.dev
```

プルリクエストを作ると、下書きを含むプレビューが `https://<ブランチ名>.etak64n-blog.pages.dev/` に公開される。

## 機能

- 記事一覧（新しい順のカード、ページ送り）、タグとタグ別の記事一覧、関連記事
- 記事の先頭とカードのヒーロー画像（フロントマターの `hero`）
- 目次（記事の左に追従）、ダークモードの切り替えスイッチ、スマートフォン用のメニュー
- コードブロック（Nord の配色、ファイル名のタブ、ターミナルの枠、コピーボタン、行番号、差分）
- 画像の WebP 変換、本文の幅に合わせた 2 つの大きさ、`width`/`height`、遅延読み込み、クリックで拡大
- 注記（`> [!NOTE]` など、色とアイコンの枠）、出典付きの引用、画像のキャプション、脚注
- RSS（`/rss.xml`）、サイトマップ（`/sitemap.xml`）、`robots.txt`、canonical URL、Open Graph、Twitter Card、JSON-LD
- 旧 URL（`/articles/<slug>/`）からの転送

## 必要なもの

- Node.js 24 以上（`.nvmrc`）と npm

## クイックスタート

```bash
npm ci                                  # 依存パッケージを入れる
npm run dev                             # http://localhost:4321/ で表示（下書きも表示される）
npm run new -- my-first-post            # 記事 src/content/blog/my-first-post/my-first-post.md を作る
```

記事の書き方、画像の貼り方、引用と出典のルールは [CONTRIBUTING.md](CONTRIBUTING.md) にある。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動する。保存すると表示が更新される |
| `npm run new -- <slug>` | 記事のフォルダーとファイルを下書きとして作る。`--open` で VS Code で開く |
| `npm run hero -- <slug>` | 記事のヒーロー画像を Workers AI で作り、`hero.webp` として保存する（CONTRIBUTING.md の「ヒーロー画像を AI で作る」） |
| `npm run check` | TypeScript とフロントマターを検査する |
| `npm run build` | `dist/` にサイトを書き出す |
| `npm run preview` | 書き出した `dist/` を表示する |

## ディレクトリ構成

```text
src/
  content/blog/      記事（<slug>/<slug>.md と画像）
  content.config.ts  フロントマターの定義と検査
  tags.ts            使えるタグと表示名
  site.ts            サイト名、URL、本文の幅などの設定
  markdown/          Markdown の拡張（注記、引用、図、画像の大きさなど）
  pages/             ページ（トップ、記事、一覧、タグ、RSS、サイトマップ、404）
  layouts/           HTML の共通部分と SEO のメタデータ
  components/        ヘッダー、記事一覧、目次などの部品
  styles/global.css  スタイル
public/              そのまま配信するファイル（favicon、OG 画像、_headers、_redirects）
scripts/             記事を作るスクリプト、Cloudflare のゾーン設定のスクリプト
.vscode/             VS Code の設定、スニペット、タスク
ec.config.mjs        コードブロック（Expressive Code）の設定
astro.config.ts      Astro の設定
wrangler.toml        Cloudflare Pages のプロジェクト
```

## ドキュメント

- [CONTRIBUTING.md](CONTRIBUTING.md)：記事の書き方（フロントマター、画像、コード、注記、引用と出典のルール、公開）
- [docs/architecture.md](docs/architecture.md)：構成（ビルド、Markdown の処理、画像、URL、SEO、デプロイ、Cloudflare の設定）
