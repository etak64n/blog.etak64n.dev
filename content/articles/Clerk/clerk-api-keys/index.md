+++
title = "Clerk の API キーの種類について"
date = 2025-09-09
updated = 2025-09-09
draft = false
taxonomies = { tags=["Clerk"], categories=["Clerk"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/hero-clerk.svg"
toc = true
+++

## Clerk の API キーの種類について

Clerk の Dashboard の API keys という項目を見ると、2種類の Key があります。
- Publishable key
- Secret keys

{{ img(src="clerk-api-keys.png", alt="Clerk API Keys") }}

Publishable key は、`pk_test_` または `pk_live_` という Prefix から始まります。
`pk_test_` は開発環境(Development instance)で、`pk_live_` は本番環境(Production instance) で使われます。{% ref(url="https://clerk.com/docs/guides/development/clerk-environment-variables", title="Development: Clerk environment variables") %}
Your Clerk app's Publishable Key. It will be prefixed with pk_test_ in development instances and pk_live_ in production instances.
{% end %}
フロントエンド側で使うキーです。ページのソースコードを見ればわかる情報で、公開されても問題ありません。

Secret key は、`sk_test_` または `sk_live_` という Prefix から始まります。
`sk_test_` は開発環境(Development instance)で、`sk_live_` は本番環境(Production instance) で使われます。{% ref(url="https://clerk.com/docs/guides/development/clerk-environment-variables", title="Development: Clerk environment variables") %}
Your Clerk app's Secret Key, which you can find in the Clerk Dashboard. It will be prefixed with sk_test_ in development instances and sk_live_ in production instances. Do not expose this on the frontend with a public environment variable.
{% end %}
バックエンド側で使うキーで、「ユーザー情報の取得」や「セッション検証」などをするための認可情報のために使われます。Secret key は公開しないように注意が必要です。

画面上の Quick copy は、フレームワークごと(スクリーンショットでは Next.js)に合わせて、よく使われる `.env` の形式を表示してくれています。
コピーするだけですぐ使えるようになります。

例えば、JavaScript だと以下のようなコードが表示されます。

```js
<script
  async
  crossorigin="anonymous"
  data-clerk-publishable-key="pk_test_Y3V0ZS1zY29ycGlvbi0yNC5jbGVyay5hY2NvdW50cy5kZXYk"
  src="https://cute-scorpion-24.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
  type="text/javascript">
</script>
```

このコードを埋め込むだけで、Clerk のログイン認証 UI を表示させることができます。

## まとめ
Clerk を使うと、ログイン画面（既存ユーザーのログイン、新規ユーザーの作成）の UI をすぐに実装することができます。
登録ユーザーの管理も Clerk の管理画面でできるため、ユーザー管理の作り込みが不要な場合は Clerk を使うと便利そうです。