+++
title = "GitHub Actions の料金についてまとめた"
date = 2025-09-01
updated = 2025-09-01
draft = true
taxonomies = { tags=["GitHub Actions"], categories=["GitHub"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/hero-github.png"
toc = true
+++

## GitHub Actions の料金についてまとめた

GitHub Actions の処理にどれくらい料金がかかるのか調べてみました。

| プラン          | Private リポジトリ 無料枠 | Public リポジトリ | 超過料金（分単位）                                                       | ストレージ無料枠 | 超過料金（Artifacts 等） |
| ------------ | ----------------- | ------------ | --------------------------------------------------------------- | -------- | ----------------- |
| **Free**（個人） | 2,000 分/月         | 無制限（無料）      | - Linux: \$0.008/分<br>- Windows: \$0.016/分<br>- macOS: \$0.08/分 | 500 MB   | 約 \$0.008/GB/日    |
| **Pro**      | 3,000 分/月         | 無制限（無料）      | - Linux: \$0.008/分<br>- Windows: \$0.016/分<br>- macOS: \$0.08/分 | 1 GB     | 約 \$0.008/GB/日    |


ポイントまとめ
- Public リポジトリではランナー時間・ストレージともに無料（制限なし）。
- Private リポジトリはプランごとに無料枠があり、超過分だけ課金。
- macOS ランナーは Linux の 10倍の単価なので注意。
- 実行時間は 1分単位で切り上げされるため、20秒でも1分としてカウント。

## まとめ
Public リポジトリは料金がかからないようです。
Private リポジトリは無料枠がありますが、単純なデプロイ程度ならほぼ無料ですね。
