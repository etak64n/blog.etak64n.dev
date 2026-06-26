+++
title = "Next.js について"
date = 2025-09-22
updated = 2025-09-22
draft = true
taxonomies = { tags=["Next.js", "Web"], categories=["Web"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/hero-nextjs.svg"
toc = true
+++

## Next.js について

Next.js は Vercel 社が開発した React ベースのフレームワークです。

{{ link(url="https://nextjs.org/", title="Next.js by Vercel - The React Framework") }}

### Next.js が生まれた背景
Facebook (現Meta) が開発した UI ライブラリ React には以下のような課題がありました。

* ルーティングがない
  * `react-router` など外部ライブラリが必要
* SSR/SSG が標準サポートされない
  * 自前でセットアップする必要がある
* 設定が複雑
  * Webpack や Babel の設定を毎回自分でやる必要があった
* SEO 対策が弱い
  * 初期表示が CSR（空の HTML から JS 実行で描画）になる

そこで Vercel（当時 Zeit） が 2016 年に Next.js を公開しました。
* 「設定不要で動く React アプリ」
  * create-next-app で即座に開発開始できる。
* SSR/SSG の統合
  * SEO に強く、表示も高速に。
* フルスタック構成
  * API Routes を備えて、フロントとバックエンドを 1 つのリポジトリで完結できる。
* パフォーマンス最適化の自動化
  * コード分割・画像最適化・フォント最適化を標準搭載。

### Next.js の利点
* 1つのリポジトリでサーバーとクライアントの両方を扱える

### App Router / Pages Router

| 観点         | **App Router (`app/`)**                                                           | **Pages Router (`pages/`)**                                 |               |
| ---------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------- |
| 基本思想       | **React Server Components が既定**。ルートはセグメント（フォルダ）単位。                                | 伝統的な Next.js。各ファイル = 各ページ。                                  |               |
| データ取得      | サーバーコンポーネント内で `await fetch()`／`revalidate`／**タグ無効化**（`revalidateTag`）など。          | `getServerSideProps` / `getStaticProps` / `getStaticPaths`。 |               |
| フルスタック     | **Route Handlers**（`app/api/**/route.ts`）で API を実装。                               | `pages/api/**` に API ルート。                                   |               |
| レンダリング     | 既定はサーバー側（RSC）。クライアント側は `"use client"` を付けた島だけ。**ストリーミング**と**分割**が強力。              | 既定はクライアント/SSR のハイブリッド。全体をハイドレートする前提。                        |               |
| レイアウト/状態   | **ネスト可能な `layout.tsx`**、`template.tsx`、`loading.tsx`、`error.tsx`、`not-found.tsx`。 | `_app.tsx` と `_document.tsx`。レイアウトの入れ子表現はやや工夫が必要。           |               |
| ルーティング表現   | 並列ルート（`@slot`）、インターセプト（`(..)post`）、グループ（`(group)`）など**高度**。                       | 動的ルートは `[slug]` / `[...slug]`。表現力は十分だが拡張は少なめ。               |               |
| ページメタ      | `generateMetadata()` で型安全にメタ生成。                                                   | `next/head` で記述。                                            |               |
| ランタイム指定    | ルート/レイアウトごとに \`export const runtime = 'edge'                                      | 'nodejs'\`。                                                 | ルート単位の切替は限定的。 |
| クライアント API | `next/navigation`（`useRouter`, `redirect`, など RSC 連携向け）。                          | `next/router`（従来の SPA 的 API）。                               |               |
| 学習コスト      | **やや高い**（RSC/キャッシュ/境界の理解が必要）。                                                     | **低め**（既存の React/SSR の感覚に近い）。                               |               |
| エコシステム互換   | 一部のライブラリはクライアントコンポーネント側に置く必要。                                                     | 互換性は高い（歴史が長い）。                                              |               |

#### App Router の例

構成

```
app/
  page.tsx
  api/
    hello/
      route.ts
```

ページ – app/page.tsx

```tsx
export default function Page() {
  return <h1>Hello from App Router</h1>;
}
```

Hello API – `app/api/hello/route.ts`

```
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ hello: "world" });
}
```

ページ: `http://localhost:3000/`
API: `http://localhost:3000/api/hello`

App Router を使用したサンプルコードです。

{{ link(url="https://github.com/etak64n/nextjs-app-router-minimal", title="etak64n/nextjs-app-router-minimal") }}

#### Pages Router の例

構成

```
pages/
  index.tsx
  api/
    hello.ts
```

ページ – `pages/index.tsx`

```tsx
export default function Home() {
  return <h1>Hello from Pages Router</h1>;
}
```

Hello API – `pages/api/hello.ts`

```tsx
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ hello: "world" });
}
```

ページ: `http://localhost:3000/`
API: `http://localhost:3000/api/hello`

Pages Router を使用したサンプルコードです。

{{ link(url="https://github.com/etak64n/nextjs-pages-router-minimal", title="etak64n/nextjs-pages-router-minimal") }}

### Next.js のルーティング

Next.js の処理の流れは Next.js のドキュメントに記載されています。 {{ ref(url="https://nextjs.org/docs/app/api-reference/file-conventions/middleware", title="Routing: Middleware | Next.js", excerpt="The following is the execution order:") }} {{ ref(url="https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites", title="next.config.js: rewrites | Next.js", excerpt="The order Next.js routes are checked is:") }}

1. `headers` (next.config)
  事前にルール化された固定ヘッダーをレスポンスに付与します。
  サーバーリクエストに追加で付与するのではなく、最終的に返すレスポンスに付与する点に注意です。
1. `redirects` (next.config)
  事前にルール化されたリダイレクト設定で、リダイレクトを行います。
  `/old` を `/new` にリダイレクトする、という設定例がわかりやすいです。
1. Middleware（ `middleware.ts` ）
  認証ガード、A/B テスト、言語/地域振り分け、Bot/UAブロック、簡易メンテナンスモード等
1. `rewrites() { return beforeFiles[]; }`（next.config）
  `rewrites()` は、特定のパスを別のパスへ書き換える処理となります。
  next.config で定義された `rewrites()` 関数に従い、`beforeFiles[]` を返します。
  サーバー側のルーティングよりも先に処理が行われ、サーバー側の実装よりも優先されるルーティング設定となります。
1. ファイルシステムの照合
  `public/`、`_next/static/`、App Router/Pages Router のルーティング設定に応じてルーティングを行います。

1. `rewrites() { return afterFiles[]; }`（next.config）
  `rewrites()` は、特定のパスを別のパスへ書き換える処理となります。
  next.config で定義された `rewrites()` 関数に従い、`afterFiles[]` を返します。
  サーバー側のルーティング処理の後に行われるため、サーバー側で処理できないものを外部のパスへルーティングするイメージです。

1. 動的ルートの照合（例：`/blog/[slug]`）
   App Router の場合は `app/blog/[slug]/page.tsx` のようなページ
   Pages Router の場合は `pages/blog/[slug].tsx` のようなページ

1. `rewrites() { return fallback[]; }`（next.config）
  `rewrites()` は、特定のパスを別のパスへ書き換える処理となります。
  next.config で定義された `rewrites()` 関数に従い、`fallback[]` を返します。
  どれにも当たらない URL を最終的に拾いたい、というユースケースで使われます。

1. ルート解決 → レンダリング（app/*/page.tsx / Route Handler 等）

#### headers(), redirects()
Next.js はまず next.config の `headers()`, `redirects()` の処理を行います。
next.config の実態はプロジェクトルートの以下の3つのファイルのいずれかとなります。 {{ ref(url="https://nextjs.org/docs/app/api-reference/config/next-config-js", title="Configuration: next.config.js | Next.js", excerpt="Next.js can be configured through a `next.config.js` file in the root of your project directory (for example, by `package.json`) with a default export.") }}

* `next.config.js` (CommonJS) {{ ref(url="https://nextjs.org/docs/app/api-reference/config/next-config-js", title="Configuration: next.config.js | Next.js", excerpt="Next.js can be configured through a `next.config.js` file in the root of your project directory (for example, by `package.json`) with a default export.") }}
* `next.config.mjs` (ES Modules) {{ ref(url="https://nextjs.org/docs/app/api-reference/config/next-config-js", title="Configuration: next.config.js | Next.js", excerpt="If you need ECMAScript modules, you can use `next.config.mjs`.") }}
* `next.config.tjs` (TypeScript) {{ ref(url="https://nextjs.org/docs/app/api-reference/config/next-config-js", title="Configuration: next.config.js | Next.js", excerpt="If you are using TypeScript in your project, you can use `next.config.ts` to use TypeScript in your configuration.") }}

{% note(type="alert") %}
<code>.cjs</code>、<code>.cts</code>、<code>.mts</code> などはサポートされていません。 {% ref(url="https://nextjs.org/docs/app/api-reference/config/next-config-js", title="Configuration: next.config.js | Next.js") %}
**Good to know**: next.config with the `.cjs`, `.cts`, or `.mts` extensions are currently not supported.
{% end %}
{% end %}

`next.config.js` の具体的なコードの例です。

```js
// next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  compress: true,
  trailingSlash: false,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

  async redirects() {
    return [{ source: "/old", destination: "/new", permanent: true }];
  },

  async rewrites() {
    return [{ source: "/api/:path*", destination: "https://bff.example.com/:path*" }];
  },
};
```

`headers()`、`redirects()` からルーティングを作成する実装は [next.js/packages/next/src/lib/load-custom-routes.ts](https://github.com/vercel/next.js/blob/canary/packages/next/src/lib/load-custom-routes.ts") です。


#### middleware.ts

プロジェクトのルートにある `middleware.ts` というファイルを使います {{ ref(url="https://nextjs.org/docs/13/app/building-your-application/routing/middleware", title="Routing: Middleware | Next.js", excerpt="Use the file `middleware.ts` (or `.js`) in the root of your project to define Middleware.") }} {{ ref(url="https://nextjs.org/docs/app/api-reference/file-conventions/middleware", title="File-system conventions: middleware.js | Next.js", excerpt="Create a `middleware.ts` (or `.js`) file in the project root, or inside `src` if applicable, so that it is located at the same level as `pages` or `app`.") }}

`middleware.ts` は、`middleware()` という名称の関数あるいは default で指定された関数(関数名は自由)をエクスポートする必要があります。 {{ ref(url="https://nextjs.org/docs/app/api-reference/file-conventions/middleware", title="File-system conventions: middleware.js | Next.js", excerpt="The file must export a single function, either as a default export or named `middleware`. Note that multiple middleware from the same file are not supported.") }}

`middleware.ts` の具体的なコードです。

```ts
// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  // 保護対象だけに絞る（静的アセット等に当てない）
  matcher: ["/dashboard/:path*", "/settings/:path*", "/api/private/:path*"],
};

export function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const session = req.cookies.get("session")?.value;

  if (!session) {
    // API は 401, ページは /login へリダイレクト
    if (nextUrl.pathname.startsWith("/api"))
      return new NextResponse("Unauthorized", { status: 401 });

    const url = new URL("/login", req.url);
    url.searchParams.set("from", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
```

`/dashboard` や `/settings`、`/api/private` のパスが保護されています。
リクエストの Cookie から `session` を確認し、`session` がなければ未認証という扱いで処理をします。
`/api` は `401 Unauthorized` が表示され、他のページは `/login` へリダイレクトします。
別のログイン処理で `session` を発行して、Cookie に付与する実装です。

`middleware.ts` からルーティングを作成する実装は [next.js/packages/next/src/lib/load-custom-routes.ts](https://github.com/vercel/next.js/blob/canary/packages/next/src/lib/load-custom-routes.ts") です。

#### rewrites(): beforeFiles[]

`rewrites()` は、特定のパスを別のパスへ書き換える処理となります。
next.config で定義された `rewrites()` 関数に従い、`beforeFiles[]` を返します。
サーバー側のルーティングよりも先に処理が行われ、サーバー側の実装よりも優先されるルーティング設定となります。

```js
// next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  async rewrites() {
    return {
      beforeFiles: [{ source: "/api/:path*", destination: "https://bff.example.com/:path*" }],
      afterFiles: [],
      fallback: [],
    };
  },
};
```

**ユースケース**

1. メンテナンス中はメンテナンスページへ飛ばす
  全てのパスに対して `/maintenance` ページへルーティングすることで、アプリ側のルーティングが発生しないため、速度が速い

1. 画像を CDN 経由にさせる
  `/img/` といったパスは `https://cdn.example.com/img/` へ飛ばすことで、ローカルに画像があっても使わせずに CDN を強制させ、ローカルデータの誤配信を防ぐ

1. レガシー移行
  `/legacy/` といったパスに対して、`https://legacy.example.com/` へルーティングすることで、新しいアプリ移行時に未実装処理を旧アプリ側で処理させる

`rewrites()` からルーティングを作成する実装は [next.js/packages/next/src/lib/load-custom-routes.ts](https://github.com/vercel/next.js/blob/canary/packages/next/src/lib/load-custom-routes.ts") です。


#### ファイルシステムの照合

* Pages Router を使っている場合 `pages/` のルーティングから `next build` で `pages-manifest.json` を作成します。
* App Router を使っている場合 `app/` のルーティングから `next build` で `app-paths-manifest.json` を作成します。
* `public` ディレクトリ内のファイルはそのまま1対1対応するルートが作成されます ( `public/avatars/me.png` は `/avatars/me.png` ) {% ref(url="https://nextjs.org/docs/app/api-reference/file-conventions/public-folder", title="File-system conventions: public | Next.js") %} Files inside public can then be referenced by your code starting from the base URL (/). {% end %}
* `/_next/static/*` 等のビルド成果物 (ビルドで出た静的アセット)

これらのルーティングでページを決定します。

#### rewrites(): afterFiles[]

`rewrites()` は、特定のパスを別のパスへ書き換える処理となります。
next.config で定義された `rewrites()` 関数に従い、`afterFiles[]` を返します。
サーバー側のルーティング処理の後に行われるため、サーバー側で処理できないものを外部のパスへルーティングするイメージです。

```js
// next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [{ source: "/api/:path*", destination: "https://bff.example.com/:path*" }],
      fallback: [],
    };
  },
};
```

`afterFiles` は `rewrites()` の中でも一番汎用的なユースケースになるので、明示的に `afterFiles` を指定せずに使うことができます。

```ts
async rewrites() {
  return [{ source: "/api/:path*", destination: "https://bff.example.com/:path*" }]; // = afterFiles
}
```

`rewrites()` からルーティングを作成する実装は [next.js/packages/next/src/lib/load-custom-routes.ts](https://github.com/vercel/next.js/blob/canary/packages/next/src/lib/load-custom-routes.ts") です。

#### 動的ルートの照合

動的ルートの例として、以下のようなパスがあります。

* `/blog/[slug]`
* `/products/[sku]`
* `/docs/[version]/[slug]`
* `/events/[id]`
* `/orders/[id]`
* `/u/[username]`

動的ページを作る方法としては、主に3通りあります。
1. ビルド時に“すべて”静的生成 (SSG)
2. アクセス時に初回生成 → キャッシュ (ISR)
3. 毎リクエストで生成 (SSR)

ページの作り方はさておき、これらのルートに合致した場合、その動的ページを返す、というのが動的ルートの照合の処理になります。

#### rewrites(): fallback[]

`rewrites()` は、特定のパスを別のパスへ書き換える処理となります。
next.config で定義された `rewrites()` 関数に従い、`fallback[]` を返します。
どれにも当たらない URL を最終的に拾いたい、というユースケースで使われます。

```ts
// next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [{ source: "/:path*", destination: "/app" }],
    };
  },
};
```

`rewrites()` からルーティングを作成する実装は [next.js/packages/next/src/lib/load-custom-routes.ts](https://github.com/vercel/next.js/blob/canary/packages/next/src/lib/load-custom-routes.ts") です。

### Next.js のリクエスト処理の例

#### Self Hosted Server

1. (クライアント) ブラウザで `/dashboard` にアクセスする
2. (クライアント -> サーバー)`GET /dashboard`
3. (サーバー) next.config の `headers()` → `redirects()` を適用 ( `redrects()` が処理された場合、3xx を返してリダイレクトして終了 )
4. (サーバー) `middleware.ts` で認証を行う
5. (サーバー) next.config の `rewrites()` で beforeFiles を適用する
6. (サーバー) 静的ファイルにヒットするか確認する ( ヒットしたらそのまま静的ページを返して終了 )
7. (サーバー) next.config の `rewrites()` で afterFiles を適用する
8. (サーバー) `app/dashboard/page.tsx` で動的ページの生成を行う
9. (サーバー -> API サーバー) `await fetch()` で API を実行する
10. (API サーバー -> サーバー) API の結果を返す
11. (サーバー -> データベース) `lib/db.ts` でデータベースへの接続を行いクエリを投げる
12. (データベース) クエリの処理をする
13. (データベース -> サーバー) クエリの結果を返す
14. (サーバー) クエリ結果を元に `/dashboard` の HTML を生成する
15. (サーバー -> クライアント) `/dashboard` の HTML を返す
16. (クライアント) HTML を描画する (この時点でユーザーはページを確認できる)
17. (クライアント) `/dashboard` で JavaScript が動作する
18. (クライアント) React と HTML のハイドレーションが行われる
19. (クライアント) ページの生成が完了

#### Edge

1. (クライアント) ブラウザで `/dashboard` にアクセスする
2. (クライアント -> エッジ)`GET /dashboard`
3. (エッジ) next.config の `headers()` → `redirects()` を適用 ( `redrects()` が処理された場合、3xx を返してリダイレクトして終了 )
4. (エッジ) `middleware.ts` で認証を行う
5. (エッジ) next.config の `rewrites()` で beforeFiles を適用する
6. (エッジ) 静的ファイルにヒットするか確認する ( ヒットしたらそのまま静的ページを返して終了 )
7. (エッジ) next.config の `rewrites()` で afterFiles を適用する
8. (サーバー) `app/dashboard/page.tsx` で動的ページの生成を行う
9. (サーバー -> API サーバー) `await fetch()` で API を実行する
10. (API サーバー -> サーバー) API の結果を返す
11. (サーバー -> データベース) `lib/db.ts` でデータベースへの接続を行いクエリを投げる
12. (データベース) クエリの処理をする
13. (データベース -> サーバー) クエリの結果を返す
14. (サーバー) クエリ結果を元に `/dashboard` の HTML を生成する
15. (サーバー -> クライアント) `/dashboard` の HTML を返す
16. (クライアント) HTML を描画する (この時点でユーザーはページを確認できる)
17. (クライアント) `/dashboard` で JavaScript が動作する
18. (クライアント) React と HTML のハイドレーションが行われる
19. (クライアント) ページの生成が完了

エッジ or サーバーが選べる部分もありますが、一番スタンダードな構成は上記のステップだと思います。