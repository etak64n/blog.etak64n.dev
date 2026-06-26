# リポジトリ構造定義書

## ディレクトリ構成

```
etak64n-blog/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD ワークフロー
├── .vscode/                    # VSCode 設定
├── .wrangler/                  # Wrangler キャッシュ（gitignore）
├── content/                    # コンテンツ（Markdown）
│   ├── _index.md               # サイトルート
│   └── articles/               # 記事セクション
│       ├── _index.md           # 記事一覧設定
│       ├── AI/                 # カテゴリ: AI
│       ├── AWS/                # カテゴリ: AWS
│       ├── Application/        # カテゴリ: Application
│       ├── BaaS/               # カテゴリ: BaaS
│       ├── Claude/             # カテゴリ: Claude
│       ├── Clerk/              # カテゴリ: Clerk
│       ├── Cloudflare/         # カテゴリ: Cloudflare
│       ├── GitHub/             # カテゴリ: GitHub
│       ├── Howto/              # カテゴリ: Howto
│       ├── Microsoft/          # カテゴリ: Microsoft
│       ├── Nintendo/           # カテゴリ: Nintendo
│       ├── OpenAI/             # カテゴリ: OpenAI
│       ├── Security/           # カテゴリ: Security
│       ├── Tools/              # カテゴリ: Tools
│       ├── Turso/              # カテゴリ: Turso
│       ├── Web/                # カテゴリ: Web
│       └── ブログ/              # カテゴリ: ブログ
├── docs/                       # プロジェクトドキュメント
├── public/                     # ビルド出力（gitignore）
├── sass/
│   └── main.scss               # スタイルシート
├── scripts/                    # ユーティリティスクリプト
├── static/
│   ├── images/                 # 静的画像
│   └── processed_images/       # 処理済み画像
├── templates/
│   ├── base.html               # 共通レイアウト
│   ├── index.html              # トップページ
│   ├── taxonomy_list.html      # タクソノミー一覧
│   ├── taxonomy_single.html    # タクソノミー詳細
│   ├── articles/
│   │   ├── list.html           # 記事一覧
│   │   └── single.html         # 個別記事
│   └── shortcodes/
│       ├── code.html           # コードブロック
│       ├── codebox.html        # コードボックス
│       ├── img.html            # 画像
│       ├── link.html           # リンクカード
│       ├── note.html           # 注釈
│       └── ref.html            # 参照
├── config.toml                 # Zola 設定（本番）
├── config.dev.toml             # Zola 設定（開発）
├── package.json                # npm 設定
├── wrangler.toml               # Cloudflare 設定
├── CLAUDE.md                   # Claude Code 用設定
└── README.md                   # プロジェクト説明
```

## ディレクトリ役割

### content/

Markdown で記述されたコンテンツを格納。

```
content/articles/{Category}/{slug}/
├── index.md                    # 記事本文
├── image1.webp                 # 記事内画像
└── image2.png                  # 記事内画像
```

#### 記事ファイルの命名規則

- ディレクトリ名（slug）: ケバブケース（例: `about-cloudflare`）
- 本文ファイル: 必ず `index.md`
- 画像: 記事ディレクトリ内に配置

### templates/

Tera テンプレートを格納。

| ファイル | 用途 |
|----------|------|
| `base.html` | 全ページ共通のレイアウト |
| `index.html` | トップページ専用 |
| `articles/list.html` | 記事一覧ページ |
| `articles/single.html` | 個別記事ページ |
| `taxonomy_*.html` | タグ・カテゴリページ |
| `shortcodes/*.html` | 再利用可能なコンポーネント |

### sass/

SCSS スタイルシートを格納。ビルド時に `main.css` へコンパイル。

### static/

静的アセットを格納。ビルド時にそのまま `public/` へコピー。

| ディレクトリ | 内容 |
|-------------|------|
| `images/` | ヒーロー画像、共通画像 |
| `processed_images/` | 画像処理後のファイル |

### public/

ビルド出力ディレクトリ。`.gitignore` で除外。

### docs/

プロジェクトドキュメントを格納。

## ファイル配置ルール

### 新規記事の追加

1. カテゴリディレクトリを選択または作成
2. `content/articles/{Category}/{slug}/` ディレクトリを作成
3. `index.md` を作成し、フロントマターと本文を記述
4. 画像は同ディレクトリに配置

### 新規カテゴリの追加

1. `content/articles/{NewCategory}/` ディレクトリを作成
2. `_index.md` を作成:

```toml
+++
title = "NewCategory"
transparent = true
+++
```

### 共通画像の追加

- ヒーロー画像: `static/images/hero/`
- その他共通画像: `static/images/`

### ショートコードの追加

- `templates/shortcodes/` に HTML ファイルを追加
- ファイル名がショートコード名となる

## gitignore 対象

```
public/
.wrangler/
node_modules/
.DS_Store
```
