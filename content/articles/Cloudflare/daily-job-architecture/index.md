+++
title = "Daily Job のアーキテクチャを比較してみました"
date = 2025-09-15
updated = 2025-09-15
draft = true
taxonomies = { tags=["Cloudflare Workers"], categories=["Cloudflare"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## Daily Job のアーキテクチャを比較してみました

| 候補                                   | 実現方法                                                            |     手軽さ |         目安料金（1日1回・月額） | どんな人におすすめか？                        | 注意点                                        |
| ------------------------------------ | --------------------------------------------------------------- | ------: | --------------------: | ---------------------------------- | ------------------------------------------ |
| GitHub Actions（スケジュール）               | `.github/workflows` に `on: schedule` を記述<br>cron（UTC基準）         |   ★★★★★ |         **\$0**（無料枠内） | GitHubでコード管理していて<br>軽〜中量の定期処理を回したい | ランナー時間に上限<br>厳密な秒単位の実行は不可<br>UTC基準         |
| GitLab CI/CD（スケジュール）                 | GUIでスケジュール設定<br>または `.gitlab-ci.yml` に記述                        |    ★★★★ |         **\$0**（無料枠内） | GitLabを運用中のチーム                     | 無料のCI分数が少なめ<br>自前Runnerは運用負荷が増える           |
| Bitbucket Pipelines（スケジュール）          | リポジトリ設定で日次ジョブを作成                                                |     ★★★ |         **\$0**（無料枠内） | Bitbucketユーザーの簡易な日次処理              | 無料分が少ない<br>実行時間・リソースに制限                    |
| Cloudflare Workers（Cron Triggers）    | Workerに `scheduled` ハンドラを実装<br>Cronトリガーを設定                      |     ★★★ |           **\$0〜\$5** | API連携や通知などの小さな日次タスク                | FreeはCPU時間の制限が厳しめ<br>重い処理は有料プラン推奨          |
| Vercel Cron Jobs                     | ダッシュボードでCronを設定<br>または `vercel.json` に記述 → 関数起動                 |    ★★★★ |       **\$0**（Hobby内） | 既にVercelでサイトや関数を運用中                | 実行時刻に揺れ（ウィンドウ）あり<br>コールドスタート               |
| Netlify Scheduled Functions          | Functionsにスケジュール指定（UTC）<br>関数をデプロイ                              |     ★★★ |         **\$0**（無料枠内） | Netlify利用者の軽い日次処理                  | 実行時間が短め<br>長時間バッチには不向き                     |
| AWS Lambda + EventBridge             | EventBridgeでスケジュール作成<br>Lambdaを実行                               |    ★★★★ |         **\$0**（無料枠内） | 信頼性・監視・厳密な時刻を重視                    | IAMやVPCの知識が必要<br>コールドスタート                  |
| GCP Cloud Run Jobs + Cloud Scheduler | Cloud Run Jobを作成<br>Cloud Schedulerで毎日起動                        |    ★★★★ |         **\$0**（無料枠内） | コンテナで短時間のバッチを動かしたい                 | 起動遅延があり得る<br>リージョン整合に注意                    |
| Azure Functions（Timer Trigger）       | Timerトリガーを作成<br>スケジュールを設定                                       |    ★★★★ |         **\$0**（無料枠内） | Azure中心の環境                         | コールドスタート<br>タイムゾーン設定に注意                    |
| Koyeb（常駐＋擬似Cron）                     | サービス内で `cron` を常駐<br>`supercronic` 等を利用                         |     ★★★ |              **\$0〜** | 既にKoyebで常駐コンテナがある                  | 常時稼働コストがかかる<br>再起動時の再スケジュール対策              |
| 自宅サーバ<br>VPS                         | Linuxの `cron`<br>`systemd‑timer`<br>（Dockerなら `supercronic` など） | ★★〜★★★★ | **\$0〜\$4**（VPS最安クラス） | 最安で自由度重視<br>自分で管理できる人              | 監視・バックアップ・復旧が自前<br>セキュリティ対策が必須<br>電源・回線リスク |
