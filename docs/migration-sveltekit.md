# 移行計画: Zola → SvelteKit(Cloudflare 統一構成)

## 目的

現行の Zola ブログを、参考サイト([azukiazusa1/sapper-blog-app](https://github.com/azukiazusa1/sapper-blog-app))と同等の体験(クイズ・サムネイル・多言語・画像最適化)を持つ **SvelteKit** ブログへ移行する。ただし **Contentful は使わず、コンテンツは Git の markdown を正**とし、画像・配信は **Cloudflare に統一**する。

## ターゲット構成

```
執筆:   Git の markdown (contents/) + Sveltia CMS で編集
描画:   SvelteKit (Svelte 5) + adapter-cloudflare
        ├ 本文: remark/rehype (shiki, toc, link-card, alert 等)
        └ クイズ/サムネイル/about: frontmatter → Svelte コンポーネントで描画
画像:   R2(原本) + Cloudflare Image Transformations(WebP/AVIF・リサイズ)
多言語: Paraglide (inlang) + ロケール別 markdown
配信:   Cloudflare Pages/Workers(現行と同じ、独自ドメイン blog.etak64n.dev)
```

### 技術選定(推奨)

| 項目 | 採用 | 理由 |
|---|---|---|
| フレームワーク | SvelteKit + Svelte 5 | 参考サイトと同一。インタラクティブUI(クイズ)が作りやすい |
| Markdown 変換 | unified(remark/rehype)+ gray-matter | 参考サイトの実績構成。frontmatter は YAML(`---`) |
| frontmatter | YAML | GitHub の表描画 + 目的のスキーマに合う |
| 画像 | R2 + Image Transformations | Cloudflare ネイティブ・無料枠で収まる・egress 無料 |
| i18n | Paraglide (inlang) | 参考サイトと同一。UI文言 + ロケール別コンテンツ |
| CMS | Sveltia CMS を継続 | Git ベースで SvelteKit の markdown もそのまま編集可。OAuth 設定を流用 |
| 検索 | Pagefind(任意・後回し可) | 静的・無料・日本語対応 |
| デプロイ | adapter-cloudflare + GitHub Actions | 現行パイプラインを置換 |

## 現状(移行元)

- Zola + Sveltia CMS + Cloudflare Pages / GitHub Actions 自動デプロイ
- コンテンツ: `content/articles/{slug}/index.md`(TOML frontmatter、フラット、タグのみ)
- 記事数: 7(Nintendo 6 = 下書き、テスト記事 1 = 公開)
- OAuth ログイン(sveltia-cms-auth Worker)+ `/admin` 限定 CSP(Transform Rule)設定済み
- 独自ドメイン `blog.etak64n.dev`

## 何が変わる / 変わらない

| | 変わらない | 変わる |
|---|---|---|
| ホスティング | Cloudflare Pages/Workers・独自ドメイン | ビルドが Zola → SvelteKit |
| コンテンツ | Git の markdown を正 | TOML → YAML frontmatter、スキーマ拡張 |
| 編集 | Sveltia CMS(OAuth) | config を新スキーマ/YAML/i18n 対応に |
| 画像 | — | co-located → R2 + Transformations |
| 機能 | タグ | +クイズ +サムネイル +about +多言語 |

---

## フェーズ計画

### Phase 0. 準備・意思決定(0.5日)
- [ ] 移行用ブランチ `feat/sveltekit` を作成(main は現行のまま温存)
- [ ] 未確定事項(下記「要決定」)を確定
- [ ] SvelteKit プロジェクトを `app/`(モノレポ化)or 別リポジトリで scaffold するか決定
- 成果物: 空の SvelteKit スケルトンが `npm run dev` で起動

### Phase 1. SvelteKit 骨組み + Markdown 描画(1〜2日)
- [ ] SvelteKit + adapter-cloudflare + Tailwind 導入
- [ ] `contents/` の markdown を読む load 関数(一覧・個別)
- [ ] unified パイプライン(remark-parse → gfm → rehype → shiki → toc/slug/autolink)で本文を HTML 化
- [ ] レイアウト・記事ページ・一覧・タグページの最低限を実装(現行ブログと同等の見た目)
- 成果物: 既存7記事がローカルで表示できる(画像・i18n・クイズは未対応)

### Phase 2. コンテンツ・スキーマ移行(0.5〜1日)
- [ ] frontmatter スキーマ確定(下記「スキーマ案」)+ zod で検証
- [ ] 既存7記事を TOML → YAML・新スキーマへ変換(スクリプト or 手動)
- [ ] `draft`/`published`、`date`/`updated`、`tags`、`description(about)` のマッピング
- 成果物: 全記事が新スキーマで表示

### Phase 3. 画像(R2 ミラー + Transformations)= 方式 **3b**(1日)
方針: **原本は Git に残す(source of truth)+ R2 はミラー**。配信は Transformations で最適化。
将来リポジトリを軽くしたくなったら 3a(CI が Git から削除)へ段階移行できる。
- [ ] R2 バケット作成 + 公開カスタムドメイン `images.etak64n.dev`(同一ゾーンで Transformations 可)
- [ ] Image Transformations 有効化(ゾーン設定)
- [ ] CI(GitHub Actions)に R2 書き込みトークンを追加
- [ ] CI: push 時に新規/変更画像を R2 へ**ミラー**アップロード(Git からは削除しない)
- [ ] ビルド時 remark プラグインで本文の画像URLを変換URLへ書き換え
      `https://blog.etak64n.dev/cdn-cgi/image/width=800,format=auto,quality=85/https://images.etak64n.dev/<key>`
- [ ] サムネイル(thumbnail.url)も同様に最適化配信
- [ ] dev/prod で画像参照が食い違わないようフォールバック(未ミラー時は Git 原本を参照)
- 成果物: 画像が WebP/AVIF・適切サイズで配信。原本は Git にも R2 にも存在し消失リスクなし

### Phase 4. 多言語(Paraglide + ロケール別コンテンツ)(1〜2日)
- [ ] 対応言語確定(想定: `ja` 既定 + `en`)
- [ ] Paraglide 導入(UI 文言)
- [ ] ルーティング `[[lang]]/...`、言語切替、hreflang
- [ ] コンテンツのロケール別配置(例: `contents/blogPost/{slug}/{lang}.md` or `slug.en.md`)
- 成果物: ja/en の切替が動作

### Phase 5. リッチ機能(クイズ / サムネイル / about)(1〜2日)
- [ ] `<Quiz>` Svelte コンポーネント(選択→正誤→解説表示)を実装
- [ ] frontmatter の `quizzes` を記事ページで描画
- [ ] サムネイル・概要(about/description)の表示・OGP 反映
- 成果物: 参考サイト相当のクイズ付き記事

### Phase 6. SEO・周辺(0.5〜1日)
- [ ] sitemap / RSS / OGP・メタタグ / robots
- [ ] Pagefind 検索(任意)
- [ ] **旧 URL からのリダイレクト**(URL 構造を変える場合、`_redirects` or ルールで 301)
- 成果物: 検索・フィード・SEO が現行同等以上

### Phase 7. CMS(Sveltia)更新(0.5日)
- [ ] `config.yml` を YAML frontmatter・新スキーマ(quizzes/thumbnail/description/i18n)へ更新
- [ ] `/admin` を SvelteKit の静的配信 or ルートとして提供(OAuth Worker・CSP はそのまま流用)
- 成果物: CMS から新スキーマで記事を書ける

### Phase 8. デプロイ・切替(0.5日)
- [ ] GitHub Actions を SvelteKit ビルドへ置換(Zola ステップを撤去)
- [ ] Cloudflare Pages プロジェクトのビルド設定変更(または新プロジェクト + プレビュー確認)
- [ ] プレビューURLで最終確認 → 独自ドメインを新ビルドへ切替
- [ ] 問題あれば main / 旧デプロイへ即ロールバック
- 成果物: `blog.etak64n.dev` が SvelteKit で本番稼働

---

## スキーマ案(YAML frontmatter)

```yaml
---
title: "記事タイトル"
slug: "css-random-function"
date: 2024-07-28
updated: 2024-07-28
draft: false
description: "一覧・OGP・検索に使う概要(about 相当)"
tags: ["CSS"]
thumbnail:
  url: "画像URL(R2/Transformations)"
  title: "代替テキスト"
audio: null
quizzes:                      # selfAssessment.quizzes 相当。任意
  - question: "設問文"
    answers:
      - { text: "選択肢", correct: false, explanation: "解説" }
---
本文(Markdown)…
```

> 注: SvelteKit 側は gray-matter で YAML を素直に読むため、Zola 時代の `extra.*` ネストは不要。トップレベルに自由なキーを持てる。

## 要決定事項(あなたに確認したいこと)

1. **対応言語**: `ja` + `en` でよい?(他に追加は?)
2. **URL 構造**: 現行 `/articles/{slug}/` を維持?それとも参考サイト風 `/blog/{slug}/` に変更(=旧URL 301 リダイレクトを用意)?
3. **記事のファイル名**: 人間可読な `slug` フォルダ運用でよい?(参考サイトは nanoid。可読性なら slug 推奨)
4. **プロジェクト形態**: 現リポジトリを SvelteKit 化?それとも新規リポジトリ/モノレポ?
5. **移行タイミング**: 段階公開(プレビューで検証してから切替)でよい?(推奨)

## リスクと対策

| リスク | 対策 |
|---|---|
| 移行中に本番が壊れる | ブランチ + プレビュー環境で作業、独自ドメインは最後に切替。main と旧デプロイをロールバック先に温存 |
| 旧 URL の 404(SEO 影響) | URL を変える場合は 301 リダイレクトを Phase 6 で用意 |
| 画像移行の漏れ | R2 移行後にリンク切れチェック(自動リンクチェッカ) |
| ビルド時間/コスト増 | SvelteKit は Node ビルド。Actions 無料枠内で収まる想定だが監視 |
| CMS スキーマ不整合 | zod 検証 + Sveltia のプレビューで担保 |

## コスト見込み(月額)

- R2: 10GB 無料枠内 → **$0**(egress 無料)
- Image Transformations: 5,000変換/月 無料枠内 → **$0**
- Pages/Workers: 無料枠 → **$0**
- 合計: **ほぼ $0**(規模拡大時のみ段階的に数ドル)

## 全体の所要目安

- 最短実装: **6〜10 稼働日**相当(Phase 1〜8)
- 推奨順序: Phase 1→2 で「現行同等」を作ってから、3(画像)→5(クイズ)→4(i18n)→6〜8 の順で価値の高い順に追加
```
