+++
title = "Auth系BaaSについてまとめてみた"
date = 2025-09-01
updated = 2025-09-01
draft = true
taxonomies = { tags=["Auth0","Clerk","Firebase Auth","Supabase Auth","Amazon Cognito","Okta","Kinde","Security"], categories=["BaaS"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## Auth系BaaSについてまとめてみた
BaaS は、Backend as a Service で、認証・ユーザー管理・DB・ストレージ・Push・サーバーレス実行などの汎用バックエンドをサービスとして提供するものです。

今回は、特にログイン認証周りをサービスとして提供する Auth 系 BaaS についてまとめました。
最終的には、Cloudflare Worker と相性が良い BaaS を決めてみます。

| プラットフォーム                  | 制作元 / 公式サイト             | 得意なこと・特徴                                       | 料金体系・フリーティア                                                               |
| ------------------------- | ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| **Auth0**                 | Auth0（Okta 傘下）          | エンタープライズ向け、豊富なプロトコル（OAuth, OIDC, SAML, LDAP）対応 | MAU によるティア課金。フリーティアは 25K MAU まで。高コスト傾向                                    |
| **Clerk**                 | Clerk.dev               | React/Next.js 向け UI コンポーネント豊富、開発体験良好           | フリーティア：10K MAUまで。Pro プラン \$25/月 + \$0.02/MAU。機能アドオンあり                     |
| **Firebase Auth**         | Google / Firebase       | モバイル・Google エコシステムと強く統合                        | フリーティア：50K MAUまで無料。以降は MAU ベースの課金                                         |
| **Supabase Auth（GoTrue）** | Supabase (OSS 含む)       | PostgreSQL 統合、Row-Level Security、オープンソース       | フリーティア：50K MAUまで無料。Pro プラン \$25/月                                         |
| **Amazon Cognito**        | AWS                     | AWS エコシステムとの連携が自然、ユーザープールとフェデレーション             | フリーティア：10K MAUまで（Lite）。以降は \$0.0055〜\$0.015/MAU                           |
| **Okta**                  | Okta                    | エンタープライズ向け IAM に特化（SSO, SCIM, MFA 等）           | Workforce（月 \$2/ユーザー、年間最低 \$1,500）、Customer Identity（1,000 MAU で \$23/月～） |
| **Kinde**                 | Kinde（公式サイト: kinde.com） | 認証・アクセス管理・課金を一体提供、B2C 向け UX 充実、SDK 多数、即時導入     | フリーティア：最大 10,500 MAU（無料、クレジットカード不要）([Kinde][1])                           |

[1]: https://kinde.com/?utm_source=chatgpt.com "Kinde Auth, billing and access management for modern SaaS ..."

## Cloudflare Workers × Auth 系 BaaS ランキング

| 順位 | サービス        | 制作元 / 公式リンク                     | Workers との相性理由 |
|------|-----------------|------------------------------------------|-----------------------|
| 1    | **Clerk**       | [Clerk.dev](https://clerk.com)           | Edge/Workers 公式サポート、V8 isolates 対応。SDK が軽量で Node 依存なし。 |
| 2    | **Kinde**       | [Kinde](https://kinde.com)               | Cloudflare Workers ガイドあり。JWT 検証方法を公式解説。Zero Trust 連携も容易。 |
| 3    | **Supabase Auth** (GoTrue) | [Supabase](https://supabase.com) | `jose` での JWT 検証が公式に推奨。Postgres/RLS と組み合わせやすい。 |
| 4    | **Auth0**       | [Auth0 (by Okta)](https://auth0.com)     | JWT/JWKS 検証は Workers で問題なし。SSO/SAML 等エンタープライズ要件が強み。 |
| 5    | **Amazon Cognito** | [Amazon Cognito](https://aws.amazon.com/cognito/) | Workers 対応の JWT 検証ライブラリあり。AWS スタックとの統合が強力。 |
| 6    | **Okta**        | [Okta](https://okta.com)                 | 単体利用より Cloudflare Access 経由が便利。エンタープライズ ID 管理に最適。 |
| 7    | **Firebase Auth** | [Firebase](https://firebase.google.com) | フロントは容易だが Admin SDK が Node 依存。Workers 側は `jose` で代替。 |

## Authサービス別「ユーザーはどこに保存？」

| サービス | どこに主記録が保存される？ | 自前DBを主ストアにできる？ | メモ（Workersでの扱い） | 公式ドキュメント |
|---|---|---|---|---|
| Clerk | Clerkのマネージド・ユーザーストア（Clerkのバックエンド） | ✕（主はClerk側。Webhook等で自前DBへ複製は可） | CanonicalはClerk。Webhook/ジョブでアプリDBへ同期する設計が一般的。 | Clerk Users 概要 :contentReference[oaicite:0]{index=0} |
| Kinde | Kindeのマネージド・ユーザーストア | ✕（主はKinde側。属性/組織管理はKinde） | CanonicalはKinde。必要に応じてアプリDBへミラーリング。 | Kinde ユーザー管理概要 / FAQ :contentReference[oaicite:1]{index=1} |
| Firebase Auth | Googleが管理する**プロジェクト内ユーザーデータベース**（Auth専用ストア） | ✕（拡張属性はFirestore等に別途保存） | 追加プロフィールは自前DB/Firestoreへ。Workers側はJWT検証のみでOK。 | Firebase Users / Manage Users :contentReference[oaicite:2]{index=2} |
| Supabase Auth（GoTrue） | **あなたのSupabase Postgres**の`auth`スキーマ（同一プロジェクトDB内） | ○（=自前Postgres上。OSS自ホストも可） | ユーザーが同一DB内にあるのでRLS等でアプリデータと直接連携しやすい。 | Auth Architecture / Users :contentReference[oaicite:3]{index=3} |
| Amazon Cognito | **Cognito User Pool**（AWSのマネージド内部ストア） | ✕（主はCognito。アプリDBへ別途同期） | 主記録はUser Pool。アプリ側に必要分を複製する構成が定番。 | User pools / 保存先の説明 :contentReference[oaicite:4]{index=4} |
| Auth0 | Auth0の**ユーザーストア** もしくは **Custom DB接続**で外部ストア（移行/プロキシも可） | ○（Custom DB接続で既存DBを主にできる） | 既存IDストアを活かしたい時はCustom DB接続が有力。 | Database Connections / Custom DB :contentReference[oaicite:5]{index=5} |
| Okta | **Universal Directory（UD）**＝Oktaのディレクトリ | △（外部AD/HR等と連携可能だが主はUD） | 企業内・外部IDをUDで一元管理、アプリ側へ必要属性を連携。 | Universal Directory / User Profiles :contentReference[oaicite:6]{index=6} |

## まとめ
Cloudflare Worker と相性が良いのは、Clerk でしょうか。
