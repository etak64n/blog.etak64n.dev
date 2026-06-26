+++
title = "API デザインについて"
date = 2025-09-22
updated = 2025-09-22
draft = true
taxonomies = { tags=["Web"], categories=["Web"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## API デザインについて

### URL の違い

* https://api.github.com/
* https://api.twitter.com/1.1/
* http://qiita.com/api/v2/

サブドメインとして api をつけるパターンと /api をつけるパターンがあるようです。

* 同一Webアプリからだけ叩く内向きAPIなら /api パス型が実装も運用もラク。
* 外部公開・長期運用の独立APIなら api. サブドメイン型が拡張性・運用性で有利。

`domain.com/api/...`（パス型）

**メリット**
* CORS不要（同一オリジン：スキーム+ホスト+ポートが同じならプリフライト不要で楽）
* Cookie/セッション共有が簡単（同一オリジン）
* リバースプロキシのパス振り分けが簡単（Nginx/ALB/Cloudflareで/api→APIサーバ）
* 開発が速い（フロントと同デプロイでOK。相対パスで呼べる）

**デメリット**
* スケール/障害影響が同居（フロントとAPIが同ホスト名で密）
* キャッシュ/セキュリティのポリシー分離が弱い（WAF/Rate Limit/Cacheをパス条件で作り分け）
* CDN設定の切り分けがやや複雑（静的=強キャッシュ、API=ノーキャッシュ等をパスで分岐）

`api.domain.com/...`（サブドメイン型）

**メリット**
* 責務分離が明確（DNS・TLS・WAF・レート制限・ログ・監視をAPI専用に分離）
* スケールしやすい（APIだけ別リージョン/別基盤/別CDN/別Gatewayにできる）
* キャッシュ/ルール設計が楽（ホスト名単位でNo-CacheやBot対策を適用）
* 契約・SLA・ドキュメントの独立（外部公開APIに向く）

**デメリット**
* CORSが発生（www.等から叩くとオリジンが異なるので設定必須）
* Cookie送信戦略がやや複雑
* 認証をCookieでやる場合、オリジンは違うが “same-site”（eTLD+1が同じ）扱い→挙動理解が必要
* 実務ではCookie依存を避け、Bearer/JWTが無難
* 接続が分かれる（HTTP/2/3でもホストが分かれるとコネクション別）

セキュリティ観点（要点）
トークン認証（Bearer/JWT）推奨：サブドメイン型でもパス型でも安定。
CORS：サブドメイン型はAccess-Control-Allow-Origin等の適切設定必須。
WAF/Rate limit：サブドメイン型だとホスト単位でルール適用しやすい。
CSRF：Cookieベース認証ならサブドメインはsame-siteなのでCSRF対策（トークン/ダブルサブミット）は継続必須。

運用・SRE観点
デプロイ分離：api.はAPIだけロールバック/メンテがしやすい。
障害封じ込め：/apiはフロント障害がAPIにも波及しやすい。
可観測性：ホスト分離の方がダッシュボード/ログ集計が見やすい。
バージョニング：どちらでも/v1が一般的。サブドメインでv1.apiにする手もあるが運用負荷は増える。

目安の決め方（超シンプル版）
社内/個人・フロント専用で手早く → domain.com/api
外部公開・クライアント多様・長期運用 → api.domain.com
将来分離するかも → 初期は/apiで始め、CDN/Proxyで後からapi.へ昇格できる設計に

## まとめ
社内や個人アプリのように素早くデプロイする簡易アプリの場合は、パス型 `domain.com/api` が簡単です。
外部公開したり、開発を分離する場合は `api.domain.com` が良さそうです。