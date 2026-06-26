+++
title = "Claude Code のスラッシュコマンド一覧"
date = 2025-01-15
updated = 2025-01-15
draft = true
taxonomies = { tags=["Claude", "Claude Code", "CLI", "AI"], categories=["Claude"] }
math = false
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## Claude Code とは

Claude Code は Anthropic が提供する AI コーディングアシスタントの CLI ツールです。
ターミナル上で Claude と対話しながら、コードの作成・編集・デバッグなどを行えます。

{{ link(url="https://docs.anthropic.com/en/docs/claude-code", title="Claude Code - Anthropic") }}

## スラッシュコマンド一覧

Claude Code では `/` で始まるスラッシュコマンドを使って、様々な操作を実行できます。
`/help` コマンドで利用可能なコマンドの一覧を確認できます。

### /help

ヘルプを表示します。利用可能なコマンドの一覧や使い方を確認できます。

```sh
> /help
```

### /clear

現在の会話履歴をクリアします。新しい会話を始めたいときに使用します。

```sh
> /clear
```

### /compact

会話のコンテキストを圧縮し、トークン使用量を削減します。
長い会話でコンテキストが大きくなりすぎた場合に有用です。

```sh
> /compact
```

オプションで圧縮時の指示を追加できます。

```sh
> /compact コードの変更履歴を重視して圧縮してください
```

### /config

Claude Code の設定を表示・変更します。

```sh
> /config
```

### /cost

現在のセッションで使用したトークン数とコストを表示します。

```sh
> /cost
```

### /doctor

Claude Code の診断を実行し、問題がないか確認します。
環境設定やインストール状態をチェックできます。

```sh
> /doctor
```

### /init

プロジェクトを初期化し、`CLAUDE.md` ファイルを作成します。
このファイルにはプロジェクトの概要や Claude への指示を記述できます。

```sh
> /init
```

### /login

Claude Code にログインします。

```sh
> /login
```

### /logout

Claude Code からログアウトします。

```sh
> /logout
```

### /memory

Claude のメモリ（`CLAUDE.md` に保存された情報）を確認・編集します。

```sh
> /memory
```

### /model

使用する Claude モデルを選択します。

```sh
> /model
```

利用可能なモデルから選択できます：
- claude-sonnet-4-20250514
- claude-opus-4-20250514
- claude-haiku-3-5-20241022

### /permissions

ツールの実行権限を管理します。
ファイルの読み書きやシェルコマンドの実行などの権限を確認・変更できます。

```sh
> /permissions
```

### /pr_comments

GitHub の PR コメントを確認します。

```sh
> /pr_comments
```

### /review

コードレビューを実行します。
現在の変更内容について Claude がレビューを行います。

```sh
> /review
```

### /status

Claude Code のステータスを確認します。

```sh
> /status
```

### /terminal-setup

ターミナルの設定を行います。
キーバインドやシェルの統合設定などを構成できます。

```sh
> /terminal-setup
```

### /vim

Vim モードを切り替えます。
有効にすると、入力時に Vim のキーバインドが使えるようになります。

```sh
> /vim
```

## キーボードショートカット

スラッシュコマンド以外にも、キーボードショートカットで操作できます。

| ショートカット | 説明 |
|---------------|------|
| `Ctrl+C` | 現在の生成を中断 |
| `Ctrl+D` | セッションを終了 |
| `Escape` (2回) | 入力中のテキストをクリア |
| `↑` / `↓` | 入力履歴を移動 |

## まとめ

Claude Code のスラッシュコマンドを使いこなすことで、効率的に開発作業を進められます。
特に `/compact` や `/cost` は長時間の作業で便利です。
