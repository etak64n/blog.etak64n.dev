+++
title = "AGENTS.md について"
date = 2025-09-01
updated = 2025-09-01
draft = true
taxonomies = { tags=["OpenAI", "codex"], categories=["OpenAI"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## AGENTS.md について

AGENTS.md の主な目的は「AI コーディングエージェントがプロジェクトで正しい判断、正しい操作をできるように、必要な文脈（＝build／test／命名規約／コードスタイル／ファイル構成など）を一か所にまとめて与えること」です。

README.md が人間向けだとしたら AGENTS.md は AI コーディングエージェント向けとなります。

**背景**

プロジェクトやツールごとに AI エージェント向けの指示ファイルの名前やフォーマットがバラバラで、「.prompt」「instructions.md」「claude.md」「agent.md」などさまざまな形式が使われていました。
これが混乱を招いていたため、これらを統一・簡素化しようという動きとして AGENTS.md が提唱されました。

AGENTS.md
https://agents.md/

## AGENTS.md の使い方

1. AGENTS.md のルートディレクトリに配置する
リポジトリのルートディレクトリに「AGENTS.md」を作成してください。
多くのコーディングエージェントは、リクエストすれば自動的にこのファイルを作成してくれます。

2. AGENTS.md に必要な情報を記載
AIツールがプロジェクトと効果的に連携できるように、必要な情報を記載してください。よくある項目は以下のとおりです。

・プロジェクト概要
・ビルド・テストコマンド
・コーディングスタイルガイドライン
・テスト手順
・セキュリティに関する注意事項

