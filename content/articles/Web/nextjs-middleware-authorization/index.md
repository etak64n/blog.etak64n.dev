+++
title = "Next.js の middleware.ts の認証実装方法"
date = 2025-09-22
updated = 2025-09-22
draft = true
taxonomies = { tags=["Web","Next.js"], categories=["Web"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/hero-nextjs.svg"
toc = true
+++

## Next.js の middleware.ts の認証実装方法

| 用途                                 | 推奨                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| **一般的な SaaS**（ソーシャル/メール認証・管理画面・権限） | **Clerk**（Middleware＋サーバーヘルパー）で十分。*最小コードで安全*。([Clerk][1])                                   |
| **外部 IdP なし・自前で完結**                | Edge 互換の署名トークン（HMAC/JWT）＋軽い Middleware。重い確認は Route Handler 側へ。([Next.js][2])                |
| **既存の社内セッション/DB と厳密連携**            | Node ランタイムの Middleware ではなく、**Route Handler で検証**（Middleware は“楽観的”チェックに留める）。([Next.js][2]) |

[1]: https://clerk.com/docs/references/nextjs/clerk-middleware "Next.js: clerkMiddleware() | Next.js"
[2]: https://nextjs.org/docs/app/api-reference/file-conventions/middleware?utm_source=chatgpt.com "File-system conventions: middleware.js - Next.js"


### Clerk を使った Middleware の最小実装

```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtected = createRouteMatcher([
  '/dashboard(.*)',
  '/settings(.*)',
  '/api/private(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // ページ/API共通で保護判定
  if (isProtected(req)) {
    const { isAuthenticated, redirectToSignIn } = await auth();

    // API は 401、ページはサインインへ
    if (!isAuthenticated) {
      if (req.nextUrl.pathname.startsWith('/api')) {
        return new Response('Unauthorized', { status: 401 });
      }
      return redirectToSignIn(); // returnBackUrl は自動付与されます
    }
  }
});

// Next.js の内部/静的ファイルを除外しつつ、API には常に適用
export const config = {
  matcher: [
    // Next.js 推奨の除外パターン＋API
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

`/dashboard`、`/settings`、`/api/private/*` のページを保護対象にしています。
`/api` ページは 401 Unauthorized のエラーで、それ以外はサインインのページへリダイレクトします。

### Cookie の有無だけでガード（Edge 既定）

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

