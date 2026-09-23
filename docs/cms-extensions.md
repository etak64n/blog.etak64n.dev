# CMS 拡張 (Sveltia CMS の JavaScript API)

`/admin/` の Sveltia CMS に、ブログ固有の機能を JavaScript API で足している。
CMS 本体はフォークせず、`static/admin/*.js` と `functions/` だけで完結する。

| 機能 | 実装 | Sveltia の API |
|---|---|---|
| ショートコードのプレビュー | `static/admin/shortcodes.js` + `preview-template.js` | `registerPreviewTemplate`, `registerPreviewStyle` |
| 本文エディタ (記法の挿入、画像の貼り付け) | `static/admin/body-editor.js` + `snippets.js` | `registerFieldType` (`addFile`) |
| AI ヒーロー画像 | `static/admin/hero-field.js` + `functions/api/admin/hero.ts` | `registerFieldType` (`addFile`, `pickFile`) |
| 標準エディタ用の挿入フォーム (予備) | `static/admin/editor-components.js` | `registerEditorComponent` |

Sveltia CMS の版は `static/admin/index.html` で **固定** している (`@sveltia/cms@0.218.3`)。
上の API は 2026 年 3 月〜9 月に入ったばかりなので、上げるときは動作確認してから。

## 構成

```
static/admin/
  index.html            CMS 本体の読み込み (版固定、手動 init)
  config.yml            コレクション定義。hero は widget: hero-ai
  cms.js                エントリ。プレビュー CSS 登録、各拡張の登録、CMS.init()
  csp-compat.js         本番 CSP 下でプレビュー iframe を動かす互換処理 (blob: → srcdoc)
  shortcodes.js         Zola ショートコード → プレビュー用 HTML (templates/shortcodes/ の移植)
  snippets.js           本文エディタで挿入する記法の定義 (テンプレート、欄の例と名前、確定時の扱い)
  body-editor.js/.css   本文エディタ (widget: body-editor)
  preview-template.js   記事プレビュー (single.html 相当: ヒーロー / タイトル / 日付 / タグ / 本文)
  editor-components.js  note / code / img / link の挿入フォーム (本文を widget: markdown に戻したとき用)
  hero-field.js         ヒーロー画像フィールド (AI 生成 / 既存から選択 / プレースホルダー)
  hero-image.js         生成画像を 1200×630 の WebP に収める処理
  preview.css           プレビュー iframe 専用の補正 (main.css の後に読む)
functions/api/admin/
  _middleware.ts        同一オリジン + Bearer ADMIN_KEY の検証
  hero.ts               Workers AI で画像生成 (プロンプト生成 → 画像生成)
functions/favicon/
  [host].ts             リンクカード・参照のファビコンをリンク先から取って同一オリジンで返す (公開)
functions/lib/
  favicon.ts            リンク先サイトのアイコン指定を読んで画像を取る処理
```

## ショートコードのプレビュー

対応: `{% ref %}`, `{% note %}`, `{% code %}`, `{% codebox %}`, `{{ img() }}`, `{{ link() }}`。
`shortcodes.js` の `transformShortcodes()` が本文の Markdown 中のショートコードを、
サイトのテンプレートと同じクラス構造の HTML に置き換え、Sveltia が公開している `marked` と
`DOMPurify` で HTML にする。記事フォルダの画像は `getAsset()` で、コードは highlight.js で描く。
プレビュー iframe にはサイトの `/main.css` を読み込むので見た目が本番に揃う。

- コードブロックとインラインコードの中は変換しない
- 未対応のショートコードはそのまま表示される
- `ref` のホバーは本番では JS 制御だが、プレビューでは CSS の `:hover` で開く
- favicon は公開ページと同じ `/favicon/<ホスト名>` から読む ([/admin の CSP との関係](#admin-の-csp-との関係))

## 本文エディタ

本文は Markdown をそのまま書く独自エディタ (`widget: body-editor`)。独自記法をすぐ挿入できる。

- **挿入**: ツールバーの 参照 / 補足 / 注意 / 警告 / コード / コード枠 / リンクカード / 画像、
  または ⌘/ (Windows は Ctrl+/) の一覧から。一覧は「ref」「注意」「code」などで絞り込める
- **包む**: 文字を選んでから挿入すると、その文字が中身になる (ref の引用文、note の本文、
  code のコード、リンクカードの URL)
- **例の値**: 挿入すると各欄に例が入る (リンクカードなら `https://example.com/article`・
  「ページのタイトル」・「ページの説明」)。最初に埋める欄の例が選択された状態なので、そのまま
  打てば置き換わる。ボタンのツールチップと一覧にも、例を入れた形の記法が出る
- **欄の移動**: url → title → 本文のように Tab / Shift+Tab で欄を移り、移った先の例が選択
  される。1 行の欄では Enter でも次へ進む。クリックで別の欄に移ってもよい。案内行に入力中の
  欄の名前が出て、省略できる欄には「省略可。例のままなら消えます」と添える
- **確定**: 最後の欄で Tab、Esc、または記法の外へキャレットを動かす (クリック・矢印キー) と
  確定する。書き換えなかった例と空の欄は次のように片付ける。⌘Z で片付ける前に戻せる

  | 欄 | 例のまま・空のとき |
  |---|---|
  | ref / link の title、link の desc、code の file、codebox の title と language、img の alt | 引数ごと消す |
  | code の ``` の言語 | 空にする (ファイル名の拡張子から推定される) |
  | URL、ref の引用文、note の本文、コード | 例のまま残す (プレビューで気付ける) |

  一度でも打ち直した欄は、例と同じ文字でも残す。記法の外で打ち始めたときや、欄の外の文字を
  書き換えたときは片付けずに確定する
- **画像**: 貼り付け・ドロップ・画像ボタンで追加すると記事フォルダ (index.md の隣) に保存され、
  `{{ img(src="…") }}` が入る。保存前は一時 URL で、保存時にファイル名に置き換わる
- **Escape**: Sveltia では Esc が「編集をやめる」。記法の入力中・一覧の表示中・日本語変換中の
  Esc は本文エディタが受け取り、編集画面は閉じない (Sveltia のショートカットより先に
  window の捕捉段階で処理している)
- 入力は非制御の textarea で、キャレット位置・元に戻す (⌘Z)・日本語変換を CMS の再描画が
  邪魔しない

code / codebox のコードも、普通の ``` と同じく Zola がビルド時に色を付ける (テーマは Nord)。
テンプレートがコードを ``` で囲み直して `markdown` フィルターに通している。言語は `language` 引数、
``` の言語、ファイル名の拡張子の順に決まる。次の 2 つは色を付けずに表示する。

- `theme="light"` の枠 (Nord の色は暗い背景用のため)
- ショートコードに見えるコード (エスケープした `{{/* name(key="value") */}}` など)。
  `markdown` フィルターがショートコードを解釈し直し、ビルドが失敗するため

ファイル名は、コードの上にエディタのタブのような見出しとして出す。1 行目に `// filename: app.js` と
書いた普通の ``` も、base.html のスクリプトが同じタブにする。プレビューは highlight.js の Nord で
色を付けるので、配色は公開ページとほぼ同じになる (字句の切り方は Zola と少し違う)。

記法を増やすときは `snippets.js` にテンプレート・欄の例 (`samples`)・欄の名前 (`labels`)・
確定時の扱い (`optional` は引数ごと消す、`clear` は空にする) を足し、プレビュー用の描画を
`shortcodes.js` の `renderers` に足す。標準の Markdown エディタに戻すときは `config.yml` の本文を
`widget: markdown` にする (リッチテキストの挿入メニューで note / code / img / link が使える)。

## AI ヒーロー画像

1. 記事編集画面の「ヒーロー画像」で **AI で生成** を押す
2. `hero-field.js` がタイトル・タグ・本文冒頭 (1500 字) を `/api/admin/hero` に POST
3. `hero.ts` がテキストモデルで英語の画像プロンプトを作り (サイトの配色に合わせたスタイル固定)、
   画像モデルで生成して画像をそのまま返す。使ったプロンプトは `X-Hero-Prompt` ヘッダー
4. ブラウザ側で 1200×630 に収めて WebP 化し、`addFile()` で記事の下書きに添付する。
   縦横比が 1200:630 に近い画像は枠いっぱいに切り抜く。既定モデルの正方形のように比率が違う画像は、
   被写体が欠けないよう全体を中央に置き、左右を元画像の背景色 (縁でいちばん多い色) で塗って
   境目をぼかす (`static/admin/hero-image.js`)。プロンプトでも無地の背景と中央配置を指定している
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
flux-1-schnell は正方形 (1024×1024) しか出せない。`@cf/leonardo/phoenix-1.0` や
`@cf/bytedance/stable-diffusion-xl-lightning` のように width/height を受け付けるモデルに変えると、
`hero.ts` は 1216×640 で生成し、ブラウザ側は切り抜きで枠いっぱいに使う。

### 認証

`/api/admin/*` は同一オリジンかつ `Authorization: Bearer <ADMIN_KEY>` のときだけ動く。

- 本番の鍵: GitHub Secrets の `ADMIN_KEY` → deploy.yml が毎回 Pages の secret に書き込む
- ローテーション: `gh secret set ADMIN_KEY -R etak64n/blog.etak64n.dev` して main に push
- CMS 側: 初回に「管理 API キー」欄へ貼る。localStorage に保存され、401 が返ると消える

## /admin の CSP との関係

本番の `/admin` には etak64n.dev ゾーンの Transform Rule が Content-Security-Policy を付ける
(このリポジトリの外)。その方針を変えずに動かすため、管理画面側で 2 つ対処している。

| 本番での症状 | 原因 | 対処 |
|---|---|---|
| プレビュー欄が空になる (`Framing 'blob:…' violates … default-src 'self'`) | Sveltia はプレビュー雛形かスタイルを登録すると、プレビュー欄を `blob:` URL の iframe で描く。CSP に `frame-src` が無く、`'self'` は `blob:` に一致しない | `static/admin/csp-compat.js` が text/html の Blob URL を iframe の `srcdoc` に差し替える |
| 独自フィールドとプレビュー雛形が動かない (`immutable.es.js` の読み込み失敗) | Sveltia は Immutable.js と Shiki を unpkg.com から動的 import する。`script-src` に unpkg が無い | `static/admin/index.html` の import map で `https://unpkg.com/` を jsDelivr に付け替える |

Transform Rule に `frame-src 'self' blob:` と `script-src` の `https://unpkg.com` を足せば、
どちらの対処も不要になる。

公開ページの CSP は画像を同一オリジン (と data:) にしか許可しない。リンクカードと参照の
ファビコンはリンク先サイトの画像なので、`functions/favicon/[host].ts` がリクエストのたびに
リンク先サイトから取得し、`/favicon/<ホスト名>` として同一オリジンで返す (テンプレートと
プレビューはこの URL を使う)。第三者のファビコンサービスは使わず、ブログ側には何も保存しない。

- リンク先のトップページを読み、`<head>` のアイコン指定 (icon / apple-touch-icon) を探す。
  48px 前後を優先し、無ければ `/favicon.ico`。処理は `functions/lib/favicon.ts`
- 中身は先頭バイトで PNG / ICO / GIF / JPEG / WebP を判定し、正しい型を付けて返す。
  それ以外 (見つからない・空・SVG など) は地球アイコンにするので、壊れた画像にはならない
- 取得元の URL はレスポンスヘッダー `X-Favicon-Source` に出る
- 読み込み中は地球アイコンを出す。main.css が画像の背景に地球を敷き、読み込み完了で
  `.is-loaded` を付けて外す (公開ページは templates/base.html、プレビューは preview-template.js)
- 読者のブラウザが普通の画像と同じく 1 日保持する。他サイトからの直リンク
  (Sec-Fetch-Site が cross-site / same-site) は 403
- 1 件あたり 0.1〜2 秒ほどかかる (リンク先の応答しだい)。ボットを拒むサイトは地球アイコンになる

次の 2 つは CSP に弾かれたままだが、動作には影響しない。

- Sveltia が自分のロゴ (`data:` URL) を fetch する処理
- GitHub の稼働状況 (githubstatus.com) の確認

## ローカルで試す

```sh
cp .dev.vars.example .dev.vars   # ADMIN_KEY と DEV_FAKE_AI=true
npm run admin                    # scripts/admin-dev.sh
open http://127.0.0.1:8788/admin/?backend=test
```

`scripts/admin-dev.sh` は一時ディレクトリにビルドし、本番サイトから取得した CSP を `_headers` に
書いてから `wrangler pages dev` を起動する。`/admin` と公開ページ (`/`, `/articles/*`, `/tags/*`,
`/page/*`) の両方に本番と同じ方針が付くので、CSP 起因の不具合もローカルで再現できる。
wrangler.toml の Workers AI バインディングは外して起動するので、Cloudflare へのログインは要らない。

`?backend=test` を付けると GitHub の代わりにブラウザ内 (OPFS) の Test backend を使うので、
ログインなしで記事を作って保存できる。`DEV_FAKE_AI=true` のときは Workers AI を呼ばず、
プロンプトを書いた SVG を返す。

型チェック: `npm run typecheck` (functions/ のみ)。

## ハマりどころ (2026-09-23 時点、Sveltia 0.218.3)

- Zola 0.22 の記法テンプレートで踏んだもの (templates/shortcodes/code.html と codebox.html を修正済み):
  - `lang` は予約名。記法の中では常にページの言語 (`ja`) で、同名の引数は読めない。言語は `language` で渡す
  - Tera の文字列はバックスラッシュをそのまま残す。正規表現のバックスラッシュは 1 本で書く (`\\.` と書くと 2 本のまま渡る)
  - `regex_replace` の置換引数は `rep`。`default(value=未定義の変数)` は既定値側の評価でエラーになる
  - Tera の文字列の `"\n"` は改行にならない。改行を含む文字列はテンプレート本文から作る
    (`{% filter markdown %}` の節に ``` を直接書いている)
  - Zola は記法の中身を前後の空白ごと詰めて渡す。1 行目の字下げは消える
  - 記法の中身に書いたショートコードは、ページ側で先に解釈される。`markdown` フィルターを通すと
    もう一度解釈されるので、エスケープした書き方も失敗する
  - プレビューは JavaScript で描くので、こうした不整合に気づけない。記法を足したら `zola build` で確かめる
- Sveltia のキーボードショートカットは window の捕捉段階で処理され、Esc は編集画面の
  「閉じる」ボタンを押す。しかもキーの物理位置 (code) だけで判定し、日本語変換中かを見ない。
  Esc を使う入力部品は、`CMS.init()` より前に window の捕捉段階へリスナーを登録して先に受け取る。
- DOMPurify の既定は `blob:` の URL を消す。貼り付け直後の画像を見せるプレビューでは、
  Sveltia と同じ `ALLOWED_URI_REGEXP` を渡している。
- 本番だけ壊れる場合はまず CSP を疑う。ブラウザのコンソールに `violates the following
  Content Security Policy directive` が出る。`npm run admin` は本番の CSP を適用して起動する。

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
