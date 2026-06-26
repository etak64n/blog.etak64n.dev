+++
title = "Amazon Quick Suite で Chat Agents を使おう"
date = 2025-12-01
updated = 2025-12-01
draft = true
taxonomies = { tags=["AWS","Quick Suite","AI"], categories=["AWS"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/hero-aws.png"
toc = true
+++

## Amazon Quick Suite で Chat Agents を使おう

Amazon Quicu Suite を使って Chat Agents を使ってみます。

- Region: US East (N. Virginia) で Quick Suite 登録
- PDF を入手
- Quick Suite にアップロード
  - PDFを含む多様なファイル形式がサポートされており、最大20ファイル、各50MBまでアップロード可能です。
- Microsoft サービス条項を読む

### サポートされているファイル

## 事前準備


### チャットエージェントの作成

Quick Suite を作った時点で、デフォルトで My Assistant というチャットエージェントが作られます。
- デフォルトのチャットエージェント(My Assistant)
- 独自のチャットエージェント

独自のチャットエージェントでは、プロンプトを自分で設定して特定のスキルに特化したエージェントを作ることができます。
Training Guide、Project Coordinator、Onboarding Helper といったサンプルプロンプトが用意されています。

{{ img(src="chat-agents-sample-prompt.png", alt="Quick Suite Chat Agents Sample Prompt") }}

Project Coordinator をクリックすると、プロンプトが自動で入力されます。

## 使い方

### PDF をアップロードして要約する

試しに Nintendo の決算情報をチャットエージェントに分析してもらいます。

Nintendo の決算情報は、Nintendo 公式の株主・投資家向け情報のページから取得することができます。

{{ link(url="https://www.nintendo.co.jp/ir/library/earnings/index.html", title="株主・投資家向け情報：IRライブラリー - 決算短信等") }}

今回は「第2四半期決算発表」の「決算説明資料（ノート付）（3.0MB）」を読み取ってもらいます。

{{ img(src="nintendo-financial-summary.png", alt="Quick Suite Chat Agents Sample") }}

Quicu Suite のチャットエージェントを開きます。

{{ img(src="chat-agents-01.png", alt="Quick Suite Chat Agents Sample") }}

ファイルの追加ができそうなボタンをクリックすると、ファイル追加ウィンドウが表示されます。

{{ img(src="chat-agents-02.png", alt="Quick Suite Chat Agents Sample") }}

ファイルを追加した状態で「要約してください」と指示を出します。

### ウェブページを要約する

Quick Suite にはブラウザの拡張があります。

- Google Chrome
- Firefox

## スペース
チームで共有や共同作業が可能になります。

