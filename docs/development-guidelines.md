# 開発ガイドライン

## 開発環境セットアップ

### 必要なツール

| ツール | インストール |
|--------|-------------|
| Zola | https://www.getzola.org/documentation/getting-started/installation/ |
| Node.js | npm スクリプト実行用（オプション） |
| Wrangler | `npm install -g wrangler`（Cloudflare CLI） |

### 初回セットアップ

```bash
# リポジトリクローン
git clone https://github.com/etak64n/etak64n-blog.git
cd etak64n-blog

# 開発サーバー起動
zola serve
# または
npm run dev
```

## コーディング規約

### Markdown（記事）

#### フロントマター

```toml
+++
title = "記事タイトル"
date = 2025-01-01
updated = 2025-01-15              # 更新時のみ追加
draft = false

[taxonomies]
tags = ["Tag1", "Tag2"]
categories = ["Category"]

[extra]
hero = "/images/hero/example.webp"
toc = true
math = false
+++
```

#### 見出しレベル

- `#`（h1）は使用しない（タイトルはフロントマターで指定）
- `##`（h2）から開始
- 階層は `##` → `###` → `####` の順

#### 画像の挿入

```markdown
<!-- 同ディレクトリの画像 -->
{{ img(src="image.webp", alt="説明") }}

<!-- static/images/ の画像 -->
![説明](/images/example.webp)
```

### Tera テンプレート

#### 命名規則

- ファイル名: スネークケース（例: `taxonomy_list.html`）
- ブロック名: スネークケース（例: `{% block content %}`）

#### インデント

- スペース2つ

#### コメント

```html
{# コメント内容 #}
```

### SCSS

#### 命名規則

- クラス名: ケバブケース（例: `.article-card`）
- 変数名: ケバブケース（例: `$primary-color`）

#### 構成

- 1ファイル（`main.scss`）で管理
- セクションはコメントで区切る

```scss
// ===================
// Header
// ===================
```

## 命名規則

### ファイル・ディレクトリ

| 対象 | 規則 | 例 |
|------|------|-----|
| 記事スラッグ | ケバブケース | `about-cloudflare` |
| カテゴリ | パスカルケース | `Cloudflare`, `OpenAI` |
| テンプレート | スネークケース | `taxonomy_list.html` |
| ショートコード | スネークケース | `code.html` |
| 画像ファイル | ケバブケース | `hero-image.webp` |

### コード内

| 対象 | 規則 | 例 |
|------|------|-----|
| CSS クラス | ケバブケース | `.article-card` |
| CSS 変数 | ケバブケース | `--primary-color` |
| JavaScript 変数 | キャメルケース | `themeToggle` |
| JavaScript 関数 | キャメルケース | `applyTheme()` |

## Git 規約

### ブランチ戦略

- `main`: 本番ブランチ（push で自動デプロイ）
- 機能開発は `main` から直接、または feature ブランチで実施

### コミットメッセージ

Conventional Commits 形式を推奨:

```
<type>(<scope>): <subject>

<body>
```

#### Type

| Type | 用途 |
|------|------|
| feat | 新機能 |
| fix | バグ修正 |
| docs | ドキュメント |
| style | フォーマット変更 |
| refactor | リファクタリング |
| perf | パフォーマンス改善 |
| chore | その他 |

#### 例

```
feat(articles): add new article about Cloudflare Workers
docs(readme): update development instructions
fix(template): correct ToC scroll behavior
```

### Pull Request

- タイトル: コミットメッセージと同様の形式
- PR 作成時に Preview URL が自動生成される

## 記事作成フロー

### 1. ディレクトリ作成

```bash
mkdir -p content/articles/{Category}/{slug}
```

### 2. index.md 作成

```bash
touch content/articles/{Category}/{slug}/index.md
```

### 3. フロントマター記述

```toml
+++
title = "記事タイトル"
date = 2025-01-15
draft = true                    # 下書き状態で開始

[taxonomies]
tags = ["Tag1"]
categories = ["Category"]

[extra]
toc = true
+++
```

### 4. 本文執筆

Markdown で本文を記述。

### 5. プレビュー確認

```bash
zola serve
```

### 6. 公開

`draft = false` に変更し、`main` にプッシュ。

## 品質チェック

### ビルド確認

```bash
zola build
```

エラーがないことを確認。

### リンク確認

- 内部リンクの整合性
- 外部リンクの有効性

### 画像確認

- 適切なサイズ（WebP 推奨）
- alt テキストの設定

## トラブルシューティング

### スタイルが反映されない

- ブラウザキャッシュをクリア
- `zola serve` を再起動

### ビルドエラー

- フロントマターの TOML 構文を確認
- Tera テンプレートの構文を確認

### デプロイ失敗

- GitHub Actions のログを確認
- シークレットの設定を確認
