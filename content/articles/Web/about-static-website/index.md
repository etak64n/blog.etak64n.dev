+++
title = "静的ウェブサイトについて"
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

## 静的ウェブサイトについて

一般的なウェブサイトは、静的ウェブサイトと動的ウェブサイトに分かれます。

{{ img(src="static-and-dynamic.webp", alt="") }}

静的ウェブサイトは、サーバー側での動的処理が必要なく、HTML や CSS、画像などの静的ファイルだけが配信されるサイトになります。
動的ウェブサイトは、データベースなどを使ってデータをベースに動的処理を行い、ユーザーごとに異なるコンテンツを返すサイトになります。

### 静的ウェブサイトの特徴
* HTML・CSS・JavaScript・画像などがそのままサーバーに置かれて配信される
* リクエストごとに同じ内容を返す
* サーバー側で動的処理は行われない
  * DB問い合わせやテンプレートレンダリングなど
* 表示が速い
  * 単なるファイル配信なのでレスポンスが軽い。
* スケールしやすい
  * CDN でキャッシュしやすく、大量アクセスにも強い。
* SQL インジェクションなどの影響を受けない

### 静的ウェブサイトのユースケース
* ポートフォリオサイト
* 技術ブログ
* ドキュメントサイト

内容を変更する場合は、再ビルド・再デプロイが必要です。

### 静的ウェブサイトを公開する方法

以下のような選択肢が考えられます。

* 自宅サーバー
* 外部サーバー
* GitHub Pages
* Cloudflare Pages
* Netlify
* Vercel
* Amazon S3

| 選択肢                      | 料金の目安                 |         マネージド | ファイルが置かれる場所（デプロイ）                                     | 注意点                                                                                                         |
| ------------------------ | --------------------- | -------------: | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **自宅サーバー（Nginx/Apache）** | 機器代＋電気代（継続コスト）        |              ✖ | 自宅サーバーのローカルディスク（例：`/var/www/site` や `D:/data/htdocs`） | ルーター/NAT/IPv6対応、固定IPや**Cloudflare Tunnel**等の公開経路、停電・回線障害・バックアップ・監視、Let’s Encrypt などの証明書自動更新、パッチ適用がすべて自分の責任。 |
| **外部サーバー（VPS/専用）**       | 月額（小〜中）               | △（マネージドオプション有） | サーバー内のディレクトリや Docker ボリューム                            | OS/ミドルウェア保守が必要。CDN/WAFを前段に置くと性能・可用性↑。障害時は自力復旧。                                                              |
| **GitHub Pages**         | **無料**                |              ◎ | GitHub リポジトリ（`main`/`gh-pages`/`/docs` → 自動ビルド）       | サーバーサイド不可。**標準で認証なし**（必要なら Cloudflare Access など前段で保護）。ビルド時間・容量に上限。                                          |
| **Cloudflare Pages**     | **無料枠あり**             |              ◎ | GitHub/GitLab 連携 or 直接アップロード → Cloudflare の全球CDN      | Functions/Workers で動的拡張可。\*\*Zero Trust（Access）\*\*で簡単に保護。ビルド分・並列数の上限に注意。                                   |
| **Netlify**              | 無料枠あり（チーム機能は有料）       |              ◎ | Git 連携ビルド → Netlify CDN                               | 一部機能（パスワード保護等）が有料。Functions/Forms などは無料枠にレート/実行上限。                                                          |
| **Vercel**               | 無料枠あり（商用は有料推奨）        |              ◎ | Git 連携ビルド → Vercel Global Network                     | 無料枠のビルド/Functions/帯域に上限。認証はミドルウェア実装で対応（標準のベーシック認証なし）。                                                       |
| **Amazon S3（静的サイト）**     | **従量課金**（容量＋リクエスト＋転送） |  ○（ストレージは管理不要） | **S3 バケット**（`index.html` などを配置）                       | 独自ドメイン **HTTPS は CloudFront など前段が必須**。公開設定/ポリシーに注意。直リンク保護は別途仕組みが必要。                                         |
| **Firebase Hosting**     | 無料枠あり                 |              ◎ | `firebase deploy` → Firebase の CDN/ストレージ              | ルーティングやヘッダ設定は簡単だが、エッジ/関数は Firebase エコシステムに依存。機能は他社よりシンプル。                                                   |

## 静的ウェブサイトホスティングを実現するアーキテクチャの種類

### GitHub Pages
GitHub にデプロイして GitHub Pages で配信するアーキテクチャです。

### Cloudflare Pages
Cloudflare Pages にデプロイして Cloudflare で配信するアーキテクチャです。

デプロイ方法は3通りあります。
1. Cloudflare Pages と GitHub/GitLab を連携させて、GitHub/GitLab から Cloudflare Pages へ自動的にデプロイ
2. GitHub から GitHub Actions で Cloudflare Pages へデプロイ
3. ローカルから Cloudflare Pages へデプロイ

### CloudFront + S3
Amazon S3 にデプロイして、CloudFront で配信するアーキテクチャです。

## 静的ウェブサイトホスティングと認証

### GitHub Pages
GitHub Pages 自体に認証機能はありません。

別の機能を用いて、認証を実現することになります。
1. Cloudflare Access（Zero Trust）で前段を保護する
2. リバースプロキシ経由で GitHub Pages にアクセスし、プロキシで Basic 認証を入れる

**1. Cloudflare Access（Zero Trust）で前段を保護する**
1. GitHub Pages に独自ドメイン (`domain.com`) を設定
2. `domain.com` を Cloudflare に向けて、オリジンを GitHub Pages の URL に設定する
3. Cloudflare Zero Trust の Cloudflare Access で `https://domain.com/*` を保護する
4. Cloudflare Access のポリシーを設定すると、ポリシーに応じて GitHub Pages 上のファイル参照で Cloudflare でのログイン必須になる

**2. リバースプロキシ経由で GitHub Pages にアクセスし、プロキシで Basic 認証を入れる**
1. Nginx/Apache などで `Location /` を GitHub Pages の URL に設定する
2. Nginx/Apache などでBasic 認証を有効にする

### Cloudflare Pages
Cloudflare 製品なので、Cloudflare Access と相性が良いです。

1. Cloudflare Access を使う
2. Cloudflare Pages Functions / Cloudflare Workers でトークン検証を行う

**2. Cloudflare Pages Functions / Cloudflare Workers でトークン検証を行う**
`Authorization` ヘッダーや Cookie の JWT を検証する

### CloudFront + S3
OAC ( Original Access Control ) を使用して、S3 を非公開にし、CloudFront からのみ S3 にアクセスできるようにする。

1. Cognito + CloudFront
2. CloudFront の署名付き URL / Cookie（配布制御）
3. CloudFront Function Basic 認証

**1. Cognito + CloudFront**
1. Cognito Hosted UI を有効にする
2. 認証していない場合、Cognito Hosted UI にリダイレクトする
3. Cognito Hosted UI からの認証後、トークンを Cookie/ヘッダーで受け取る
4. Lambda@Edge / CloudFront Functions で受け取ったトークンを検証
5. 認証成功の場合、S3 から静的ファイルを返す

**2. CloudFront の署名付き URL / Cookie（配布制御）**
共有リンクや期限付きダウンロード
Web 全体のログインには不向きだが、一時的な配布には簡潔

**3. CloudFront Function Basic 認証**
CloudFront Functions（Viewer Request）で Authorization を検査

```js
function handler(event) {
  var req = event.request;
  var h = req.headers;
  var ok = h.authorization && h.authorization.value === 'Basic dXNlcjpwYXNz'; // user:pass をBase64
  if (!ok) {
    return {
      statusCode: 401,
      statusDescription: 'Unauthorized',
      headers: { 'www-authenticate': { value: 'Basic realm="Restricted"' } }
    };
  }
  return req;
}
```

