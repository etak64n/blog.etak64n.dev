+++
title = "Cloudflare Workersを試してみた：Hello / Health / Time / Weather APIを作る"
date = 2025-09-01
updated = 2025-09-01
draft = true
taxonomies = { tags=["Cloudflare Workers"], categories=["Cloudflare"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## Cloudflare Workersを試してみた：Hello / Health / Time / Weather APIを作る

Cloudflare Workersを使って、簡単なAPIサーバーを無料プランで動かしてみました。
`Hello World` から、時刻・ヘルスチェック・天気情報までを返すAPIを作り、本番環境にデプロイして削除するところまでの流れを記録します。

```ts
export default {
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);
    const json = (data: unknown, init: ResponseInit = {}) =>
      new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
        ...init,
      });

    if (url.pathname === "/health") {
      return json({ ok: true });
    }

    if (url.pathname === "/time") {
      return json({ now: new Date().toISOString() });
    }

    if (url.pathname === "/hello") {
      return json({ message: "Hello World!" });
    }

    if (url.pathname === "/weather") {
      // 東京（緯度・経度）
      const lat = "35.68";
      const lon = "139.76";
      const api = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

      try {
        const res = await fetch(api);
        if (!res.ok) return json({ error: "Failed to fetch weather" }, { status: 500 });

        const data = await res.json();
        return json({
          location: "Tokyo",
          weather: data.current_weather,
        });
      } catch (e) {
        return json({ error: "Weather API error" }, { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler;
```

## ローカルでの動作検証
wrangler を使うことでローカルでの動作検証ができます。

`wrangler dev` でローカルサーバーを立ち上げます。

```
(๑>ᴗ<) < wrangler dev
 ⛅️ wrangler 4.33.2
───────────────────
╭──────────────────────────────────────────────────────────────────────╮
│  [b] open a browser [d] open devtools [c] clear console [x] to exit  │
╰──────────────────────────────────────────────────────────────────────╯
⎔ Starting local server...
[wrangler:info] Ready on http://localhost:50293
```

curl でエンドポイントを叩くと、期待通りのレスポンスが返ります。

```sh
(๑>ᴗ<) < curl http://localhost:50293/time
{"now":"2025-09-04T03:06:43.090Z"}
```

```sh
(๑>ᴗ<) < curl http://localhost:50293/hello
{"message":"Hello World!"}
```

```sh
(๑>ᴗ<) < curl http://localhost:50293/health
{"ok":true}
```

```sh
(๑>ᴗ<) < curl http://localhost:50293/weather
{"location":"Tokyo","weather":{"time":"2025-09-04T03:00","interval":900,"temperature":25.4,"windspeed":3.6,"winddirection":315,"is_day":1,"weathercode":51}}
```

サーバー側には GET リクエストの結果が記録されます。

```sh
(๑>ᴗ<) < wrangler dev
 ⛅️ wrangler 4.33.2
───────────────────
╭──────────────────────────────────────────────────────────────────────╮
│  [b] open a browser [d] open devtools [c] clear console [x] to exit  │
╰──────────────────────────────────────────────────────────────────────╯
⎔ Starting local server...
[wrangler:info] Ready on http://localhost:50293
[wrangler:info] GET / 404 Not Found (14ms)
[wrangler:info] GET /favicon.ico 404 Not Found (3ms)
[wrangler:info] GET / 404 Not Found (2ms)
[wrangler:info] GET /time 200 OK (9ms)
[wrangler:info] GET /time 200 OK (3ms)
[wrangler:info] GET /hello 200 OK (3ms)
[wrangler:info] GET /health 200 OK (2ms)
[wrangler:info] GET /weather 200 OK (1229ms)
```

## 本番環境へのデプロイ

`wrangler deploy` で本番環境にデプロイできます。

```sh
(๑>ᴗ<) < wrangler deploy

 ⛅️ wrangler 4.33.2
───────────────────
Total Upload: 1.39 KiB / gzip: 0.66 KiB
Uploaded my-worker (2.33 sec)
Deployed my-worker triggers (1.29 sec)
  https://my-worker.etak64n.workers.dev
Current Version ID: 3a4d13f4-e231-4b35-aef5-123f5e6d54aa
```

curl で確認できました。

```sh
(๑>ᴗ<) < curl https://my-worker.etak64n.workers.dev/time
{"now":"2025-09-04T03:13:12.486Z"}
```

```sh
(๑>ᴗ<) < curl https://my-worker.etak64n.workers.dev/hello
{"message":"Hello World!"}
```

```sh
(๑>ᴗ<) < curl https://my-worker.etak64n.workers.dev/health
{"ok":true}
```

```sh
(๑>ᴗ<) < curl https://my-worker.etak64n.workers.dev/weather
{"location":"Tokyo","weather":{"time":"2025-09-04T03:00","interval":900,"temperature":25.4,"windspeed":3.6,"winddirection":315,"is_day":1,"weathercode":51}}
```

## 本番環境デプロイの削除

不要になったら削除も簡単です。

```sh
(๑>ᴗ<) < wrangler delete
 ⛅️ wrangler 4.33.2
───────────────────
✔ Are you sure you want to delete my-worker? This action cannot be undone. … yes
Successfully deleted my-worker
```

## まとめ
- Cloudflare Workers の Freeプラン だけで、Hello / Health / Time / Weather API をサクッと構築できました
- wrangler を使うことで ローカル検証 → デプロイ → 削除 まで一連の流れがとてもシンプルです
