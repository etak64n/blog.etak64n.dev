+++
title = "Turso について"
date = 2025-09-24
updated = 2025-09-24
draft = true
taxonomies = { tags=["Turso", "Database"], categories=["Turso"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/hero-turso.svg"
toc = true
+++

## Turso

Turso は、SQLite 互換のクラウド DB です。エンジンは Turso が開発する libSQL です。
HTTP/WS 経由でどこからでも接続でき、Edge/サーバーレス実行環境（Vercel Edge / Cloudflare Workers / Deno など）からそのまま使えます。
Rust で作られています。

{{ link(url="https://turso.tech/", title="Turso - the next evolution of SQLite") }}

{{ link(url="https://github.com/tursodatabase/turso", title="tursodatabase/turso: Turso Database is a project to build the next evolution of SQLite.") }}

もともとは "Limbo" でしたが、2025年1月21日に "Turso" に変わりました。 {% ref(url="https://turso.tech/blog/upcoming-changes-to-the-turso-platform-and-roadmap", title="Upcoming changes to the Turso Platform and Roadmap") %}
What we initially called "Limbo" was always meant to be a temporary name. Given the incredible community response, we're making it official: this project will simply be called "Turso". We'll be working on clear communication to distinguish between Turso the core database and our cloud service.
{% end %}






- 無料で100個のDB
- ブランチ対応
- ベクトル検索（RAG, AIフレンドリー）
- Docker 不要でローカルDB起動
- Tokyoリージョンあり
- スケール可
- 月5$でDB無限