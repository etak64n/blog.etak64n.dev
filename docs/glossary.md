# ユビキタス言語定義書

## 概要

本ドキュメントは、プロジェクト内で使用する用語の定義と命名規則を統一するためのリファレンスです。

## ドメイン用語

### コンテンツ関連

| 用語 | 英語 | 定義 |
|------|------|------|
| 記事 | Article | ブログに投稿される個別のコンテンツ |
| セクション | Section | 記事を格納するディレクトリ階層 |
| カテゴリ | Category | 記事の大分類（ディレクトリ単位） |
| タグ | Tag | 記事の横断的な分類ラベル |
| スラッグ | Slug | URL に使用される記事の識別子 |
| フロントマター | Front Matter | 記事冒頭のメタデータ（TOML形式） |
| 下書き | Draft | 非公開状態の記事 |

### UI/UX 関連

| 用語 | 英語 | 定義 |
|------|------|------|
| ヒーロー画像 | Hero Image | 記事上部に表示されるメイン画像 |
| 目次 | ToC (Table of Contents) | 記事内の見出しリスト |
| カード | Card | 記事一覧で使用されるサムネイル付きコンポーネント |
| タクソノミー | Taxonomy | タグ・カテゴリの分類体系 |
| テーマ | Theme | ライト/ダークモードの表示設定 |

### 技術用語

| 用語 | 英語 | 定義 |
|------|------|------|
| ビルド | Build | ソースから静的サイトを生成する処理 |
| デプロイ | Deploy | ビルド成果物を本番環境に配置する処理 |
| ショートコード | Shortcode | 再利用可能なテンプレートスニペット |
| テンプレート | Template | HTML 生成の雛形（Tera形式） |
| スタイルシート | Stylesheet | CSS/SCSS による見た目の定義 |

## 技術スタック用語

| 用語 | 説明 |
|------|------|
| Zola | Rust製の静的サイトジェネレーター |
| Tera | Zola で使用されるテンプレートエンジン |
| SCSS/SASS | CSS プリプロセッサ |
| KaTeX | 数式レンダリングライブラリ |
| Cloudflare Pages | 静的サイトホスティングサービス |
| Wrangler | Cloudflare CLI ツール |
| GitHub Actions | CI/CD サービス |

## コード上の命名規則

### ディレクトリ・ファイル

| 対象 | 日本語 | 英語 | コード例 |
|------|--------|------|----------|
| 記事ディレクトリ | 記事スラッグ | article slug | `about-cloudflare/` |
| 記事ファイル | 本文 | index | `index.md` |
| カテゴリディレクトリ | カテゴリ | category | `Cloudflare/` |
| セクション設定 | インデックス | index | `_index.md` |

### テンプレート

| 対象 | 日本語 | 英語 | コード例 |
|------|--------|------|----------|
| 共通レイアウト | ベース | base | `base.html` |
| 記事一覧 | リスト | list | `list.html` |
| 個別記事 | シングル | single | `single.html` |
| タクソノミー一覧 | タクソノミーリスト | taxonomy_list | `taxonomy_list.html` |
| タクソノミー詳細 | タクソノミーシングル | taxonomy_single | `taxonomy_single.html` |

### フロントマター

| 項目 | 日本語 | 英語キー |
|------|--------|----------|
| タイトル | タイトル | `title` |
| 公開日 | 公開日 | `date` |
| 更新日 | 更新日 | `updated` |
| 下書きフラグ | 下書き | `draft` |
| タグ | タグ | `taxonomies.tags` |
| カテゴリ | カテゴリ | `taxonomies.categories` |
| ヒーロー画像 | ヒーロー | `extra.hero` |
| 目次フラグ | 目次 | `extra.toc` |
| 数式フラグ | 数式 | `extra.math` |

### CSS クラス

| 用途 | クラス名 |
|------|----------|
| 記事カード | `.article-card` |
| ヒーロー画像 | `.hero-image` |
| 目次 | `.toc` |
| ナビゲーション | `.nav-desktop`, `.mobile-nav` |
| テーマ切替 | `.theme-switch` |
| ハンバーガーメニュー | `.menu-toggle` |

## 略語一覧

| 略語 | 正式名称 | 日本語 |
|------|----------|--------|
| ToC | Table of Contents | 目次 |
| SSG | Static Site Generator | 静的サイトジェネレーター |
| CI/CD | Continuous Integration/Continuous Deployment | 継続的インテグレーション/デプロイ |
| CDN | Content Delivery Network | コンテンツ配信ネットワーク |
| SCSS | Sassy CSS | - |
| SASS | Syntactically Awesome Style Sheets | - |
| PR | Pull Request | プルリクエスト |
| URL | Uniform Resource Locator | - |

## 用語使用ガイドライン

1. **一貫性**: 同じ概念には常に同じ用語を使用
2. **日本語優先**: ドキュメントでは日本語を優先、コードでは英語を使用
3. **略語**: 初出時は正式名称を併記（例: ToC（目次））
4. **新規用語**: 本ドキュメントに追加してから使用
