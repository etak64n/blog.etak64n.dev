# CMS 拡張 (Sveltia CMS の JavaScript API)

`/admin/` の Sveltia CMS に、ブログ固有の機能を JavaScript API で足している。
CMS 本体はフォークせず、`static/admin/*.js` と `functions/` だけで完結する。

| 機能 | 実装 | Sveltia の API |
|---|---|---|
| ショートコードのプレビュー | `static/admin/shortcodes.js` + `preview-template.js` | `registerPreviewTemplate`, `renderRichText`, `registerPreviewStyle` |
| 挿入メニューからのショートコード入力 | `static/admin/editor-components.js` | `registerEditorComponent` |
| AI ヒーロー画像 | `static/admin/hero-field.js` + `functions/api/admin/hero.ts` | `registerFieldType` (`addFile`, `pickFile`) |

Sveltia CMS の版は `static/admin/index.html` で **固定** している (`@sveltia/cms@0.218.3`)。
上の API は 2026 年 3 月〜9 月に入ったばかりなので、上げるときは動作確認してから。

## 構成

```
static/admin/
  index.html            CMS 本体の読み込み (版固定、手動 init)
  config.yml            コレクション定義。hero は widget: hero-ai
  cms.js                エントリ。プレビュー CSS 登録、各拡張の登録、CMS.init()
  shortcodes.js         Zola ショートコード → プレビュー用 HTML (templates/shortcodes/ の移植)
  preview-template.js   記事プレビュー (single.html 相当: ヒーロー / タイトル / 日付 / タグ / 本文)
  editor-components.js  note / code / img / link の挿入フォーム
  hero-field.js         ヒーロー画像フィールド (AI 生成 / 既存から選択 / プレースホルダー)
  preview.css           プレビュー iframe 専用の補正 (main.css の後に読む)
functions/api/admin/
  _middleware.ts        同一オリジン + Bearer ADMIN_KEY の検証
  hero.ts               Workers AI で画像生成 (プロンプト生成 → 画像生成)
```

## ショートコードのプレビュー

対応: `{% ref %}`, `{% note %}`, `{% code %}`, `{% codebox %}`, `{{ img() }}`, `{{ link() }}`。
`shortcodes.js` の `transformShortcodes()` が本文の Markdown 中のショートコードを、
サイトのテンプレートと同じクラス構造の HTML に置き換え、`CMS.renderRichText()` に渡す。
プレビュー iframe にはサイトの `/main.css` を読み込むので見た目が本番に揃う。

- コードブロックとインラインコードの中は変換しない
- 未対応のショートコードはそのまま表示される
- `ref` のホバーは本番では JS 制御だが、プレビューでは CSS の `:hover` で開く
- favicon は CSP で外部画像を読めないため地球アイコンで代用

本文フィールドは `modes: [raw, rich_text]` で **raw (Markdown) モードが既定**。
ショートコードを手書きする前提のため。リッチテキストに切り替えると、挿入メニューから
note / code / img / link をフォーム入力できる。`ref` は文中(インライン)で使うため
コンポーネント化していない (ブロックとして扱われ段落が割れるのを避ける)。

## AI ヒーロー画像

1. 記事編集画面の「ヒーロー画像」で **AI で生成** を押す
2. `hero-field.js` がタイトル・タグ・本文冒頭 (1500 字) を `/api/admin/hero` に POST
3. `hero.ts` がテキストモデルで英語の画像プロンプトを作り (サイトの配色に合わせたスタイル固定)、
   画像モデルで生成して画像をそのまま返す。使ったプロンプトは `X-Hero-Prompt` ヘッダー
4. ブラウザ側で 1200×630 に cover 切り抜き → WebP 化 → `addFile()` で記事の下書きに添付
5. 保存すると `static/images/hero/<slug>-hero.webp` が記事と同じコミットに入り、
   `extra.hero` は `/images/hero/<slug>-hero.webp` になる

「AI への追加指示」に一言入れると、その内容をプロンプトに反映する。
画像モデルは日本語の文字が苦手なので、文字なしのイラストを出す設計にしている。

### モデルと費用

| 役割 | 既定 | 変更 |
|---|---|---|
| プロンプト生成 | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Pages の変数 `AI_TEXT_MODEL` |
| 画像生成 | `@cf/black-forest-labs/flux-1-schnell` (1024², 6 steps) | Pages の変数 `AI_IMAGE_MODEL` |

flux-1-schnell は Cloudflare ホストで Workers AI の無料枠 (1 日 10,000 neurons) に収まる。
`@cf/leonardo/phoenix-1.0` や `@cf/bytedance/stable-diffusion-xl-lightning` のように
width/height を受け付けるモデルに変えると、`hero.ts` は 1216×640 で生成する。

### 認証

`/api/admin/*` は同一オリジンかつ `Authorization: Bearer <ADMIN_KEY>` のときだけ動く。

- 本番の鍵: GitHub Secrets の `ADMIN_KEY` → deploy.yml が毎回 Pages の secret に書き込む
- ローテーション: `gh secret set ADMIN_KEY -R etak64n/blog.etak64n.dev` して main に push
- CMS 側: 初回に「管理 API キー」欄へ貼る。localStorage に保存され、401 が返ると消える

## ローカルで試す

```sh
cp .dev.vars.example .dev.vars   # ADMIN_KEY と DEV_FAKE_AI=true
npm run admin                    # zola build → wrangler pages dev public --port 8788
open http://127.0.0.1:8788/admin/?backend=test
```

`?backend=test` を付けると GitHub の代わりにブラウザ内 (OPFS) の Test backend を使うので、
ログインなしで記事を作って保存できる。`DEV_FAKE_AI=true` のときは Workers AI を呼ばず、
プロンプトを書いた SVG を返す (Cloudflare にログインしていなくても動く)。

型チェック: `npm run typecheck` (functions/ のみ)。

## ハマりどころ (2026-09-23 時点、Sveltia 0.218.3)

- `CMS.renderRichText()` はエディタ部品の `toPreview` 用。プレビュー雛形から呼ぶと
  entry draft のコンテキストが無く `reading 'current'` の例外を連発する。雛形では
  `marked` + `DOMPurify` を直接使い、画像は `getAsset()` で解決している。
- プレビュー iframe は別 realm。親ウィンドウの `instanceof Element` を通したい要素は
  親の `document.createElement()` で作ってから iframe に入れる。
- フォームのフィールドは画面に入るまでプレースホルダー (遅延描画)。DOM を調べるときは
  先にスクロールしてマウントさせる。
- `addFile()` が返す `blob:` URL は保存時に公開パスへ置換される。値を加工して保存しないこと。
- 記事のスラッグが日本語タイトルから作れない場合 (ascii 設定) は Sveltia がランダム ID を付ける。
  生成画像のファイル名もその場合はタイムスタンプになる。
