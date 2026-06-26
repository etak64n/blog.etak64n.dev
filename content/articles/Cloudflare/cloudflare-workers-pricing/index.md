+++
title = "Cloudflare Workersの料金についてまとめた"
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

個人利用で簡単な処理ができるサービスとして Cloudflare Workers が良さそうでしたので、料金についてまとめてみます。

## Cloudflare Workersの料金についてまとめた

Cloudflare Workers には「Free プラン」と「Paid プラン（Standard）」の2種類があるようです。

| 項目                           | Free プラン                                                            | Standard（Paid）プラン                                                                            |
| ---------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **月額費用**                     | \$0                                                                 | \$5（最小課金額） ([Cloudflare Docs][1])                                                            |
| **リクエスト数**                   | 無料枠：100,000件/日                                                      | 無料枠：10,000,000件/月<br>超過時：\$0.30／100万リクエスト ([Cloudflare Docs][1])                             |
| **CPU時間**                    | 呼び出しあたり最大10ms の CPU（無償）                                             | 月間30,000,000ms（= 30,000秒）無料枠<br>超過時：\$0.02／100万ms ([Cloudflare][2])                          |
| **静的アセットへのリクエスト**            | 無制限・無料                                                              | 無制限・無料 ([Cloudflare Docs][1])                                                                |
| **Workers KV（キー・バリュー）**      | 読み取り：100,000/day<br>書き込み：1,000/day<br>削除・リスト：1,000/day<br>保存容量：1 GB | 読み取り：10,000,000/月<br>書き込み・削除・リスト：1,000,000/月<br>保存容量：1 GB；超過時それぞれ課金あり ([Cloudflare Docs][1]) |
| **Hyperdrive（SQL-like）クエリ**  | 2,100,000/day 無料                                                    | 無制限（Paid） ([Cloudflare Docs][1])                                                             |
| **Workers Logs**             | 200,000 ログイベント／日（保持期間 3日）                                           | 20,000,000 ログ／月無料；超過 \$0.60／100万ログ（保持期間 7日） ([Cloudflare Docs][1])                           |
| **Workers Logpush**          | 非対応                                                                 | 対応（月間10,000,000リクエスト無料枠あり；超過時 \$0.05／100万リクエスト） ([Cloudflare Docs][1])                       |
| **ビルド環境**（Workers Builds）    | ビルド時間：3,000分／月<br>同時ビルド数：1<br>タイムアウト：20分                            | ビルド時間：6,000分／月（超過 \$0.005／分）<br>同時ビルド数：6<br>タイムアウト：20分 ([Cloudflare Docs][3])                |
| **ワーカー構成制限**                 | スクリプト数：100                                                          | スクリプト数：500 ([Cloudflare Docs][4])                                                            |
| **Cronトリガー数**                | アカウントあたり 5                                                          | アカウントあたり 250  ([Cloudflare Docs][4])                                                          |
| **サブリクエスト／環境変数／ワーカーサイズなど制限** | Free 限定の制限あり                                                        | より緩和された上限あり／リミット緩和可能 ([Cloudflare Docs][4])                                                  |

[1]: https://developers.cloudflare.com/workers/platform/pricing/?utm_source=chatgpt.com "Pricing - Workers"
[2]: https://www.cloudflare.com/plans/developer-platform-pricing/?utm_source=chatgpt.com "Workers & Pages Pricing"
[3]: https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/?utm_source=chatgpt.com "Limits & pricing - Workers"
[4]: https://developers.cloudflare.com/workers/platform/limits/?utm_source=chatgpt.com "Limits · Cloudflare Workers docs"

## まとめ
Free プランの「無料枠：100,000件/日」は個人利用ではほぼ無料と考えて良さそうです。

以下のような用途が良さそうです。
- 軽量 API サーバー
- Webhook の通知の受け取り
- 1日1回のスケジュールタスク
- 10分ごとのヘルスチェック
- 毎時のログ整理
- KV ストアを使ったデータ保存
- WASM のテスト

プロジェクト数自体の数の制限はありませんが、プロジェクト全体で 100,000件/日 のようです。
