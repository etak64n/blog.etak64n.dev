+++
title = "Clerk CDN のデモを作ってみた"
date = 2025-09-01
updated = 2025-09-01
draft = false
taxonomies = { tags=["Clerk"], categories=["Clerk"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/hero-clerk.svg"
toc = true
+++

## Clerk CDN のデモを作ってみた

clerk.js を埋め込む形で実装する Clerk CDN のサンプルを作ってみました。

{{ link(url="https://github.com/etak64n/clerk-cdn-demo", title="etak64n/clerk-cdn-demo") }}

### 手順

```sh
$ git clone https://github.com/etak64n/clerk-cdn-demo
```

```sh
$ npm i
```

```sh
$ cp clerk-config-example.js clerk-config.js
```

config ファイルとして clerk-config.js を読み込むことになっています。
clerk-config-example.js を用意しているので、コピーして clerk-config.js を作ります。

```sh
$ cat clerk-config.example.js
// Copy this file to `clerk-config.js` and replace the value below
// with your Clerk Publishable Key (pk_...). This file is ignored by git.

window.CLERK_PUBLISHABLE_KEY = 'REPLACE_WITH_pk_...';
```

```sh
$ cat clerk-config.js
// Copy this file to `clerk-config.js` and replace the value below
// with your Clerk Publishable Key (pk_...). This file is ignored by git.

window.CLERK_PUBLISHABLE_KEY = 'pk_test_Y3V0ZS1zY29ycGlvbi0yNC5jbGVyay5hY2NvdW50cy5kZXYk';
```

window.CLERK_PUBLISHABLE_KEY に Clerk プロジェクトの Publishable Key を埋め込みます。

{{ img(src="clerk-publishable-key.png", alt="Clerk Publishable Key") }}

```sh
$ npm run dev
> clerk-cdn-demo@0.1.0 dev
> serve -l 5173 .


   ┌──────────────────────────────────────────┐
   │                                          │
   │   Serving!                               │
   │                                          │
   │   - Local:    http://localhost:5173      │
   │   - Network:  http://192.168.1.17:5173   │
   │                                          │
   │   Copied local address to clipboard!     │
   │                                          │
   └──────────────────────────────────────────┘
```

ブラウザで開くと、Sign-In、Sign-Up の画面が表示されます。

{{ img(src="clerk-demo.png", alt="Clerk CDN Demo") }}

Sign-Up で新規ユーザーの登録ができて、Sign-In でログインすることができます。
Google での Single Sign On も有効にしているため、Google でログインすることができます。

## まとめ
Clerk を使ったデモを作ってみました。
簡単にログインやユーザー管理が実装できる面白いプロダクトです。