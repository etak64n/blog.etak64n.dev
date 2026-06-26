+++
title = "ブランチ戦略について"
date = 2025-09-15
updated = 2025-09-15
draft = true
taxonomies = { tags=["GitHub"], categories=["GitHub"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## ブランチ戦略について

GitHub のブランチを作るタイミングやマージのタイミング、共同開発時に意識すること、などがよくわかっていなかったので、まとめてみます。

GitHub Flow というのがあるようですが、調べたら他にもルールがあるようでした。

## ブランチ戦略の種類

- Git Flow
- GitHub Flow
- GitLab Flow
- Trunk-Based Development (TBD)
- OneFlow
- Release Flow
- Forking Workflow
- Feature Brahcn Workflow
- Centralized Workflow
- Stacked Diffs

| 名称                            | 提唱・普及元（団体／人物）                                                | 内容（要旨）                                                                                   |
| ----------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Git Flow                      | Vincent Driessen（nvie）                                       | `develop`/`release`/`hotfix`/`feature` の多段ブランチで長期運用。リリースを区切って計画的に出すが、高頻度デプロイには不向き。       |
| GitHub Flow                   | GitHub（Scott Chacon）                                         | `main` を常にデプロイ可能に保ち、短命ブランチ→PR→レビュー→`main` へ統合。継続的デリバリー向けの軽量ルール。                          |
| GitLab Flow                   | GitLab                                                       | `main` を軸に **環境ブランチ**（`production`/`staging` 等）や Issue/MR を連動させる。運用（環境）に合わせた取り込みが特徴。     |
| Trunk‑Based Development (TBD) | Paul Hammant（trunkbaseddevelopment.com）                      | ほぼ常に `trunk/main` へ**小さく高頻度**に統合。ブランチは極短命、未完成は Feature Flag で隠す。強力な CI/CD 前提。            |
| OneFlow                       | Adam Ruka                                                    | Git Flow を簡素化。基本は `main`（または `develop`）＋短命ブランチ、必要時のみ `release`/`hotfix`。運用コストを下げつつ履歴を整理。 |
| Release Flow                  | Microsoft                                                    | **trunk＋リリース線**のハイブリッド。修正はまず `main` に入れ、必要な各リリースブランチへ cherry‑pick。**複数バージョン並行保守**に強い。    |
| Forking Workflow              | OSS コミュニティ／GitHub 文化                                         | 開発者ごとにフォークして作業し、PR で本家へ取り込む。権限分離・外部コントリビューション前提の定番。                                      |
| Feature Branch Workflow       | 一般（Atlassian 等が普及）                                           | 機能ごとに短命ブランチを切り、PR でレビューして統合する**基本形**。小〜中規模チームで広く採用。                                      |
| Centralized Workflow          | 一般（SVN 文化の継承、Atlassian 等が解説）                                 | 単一の中央リポジトリに向けて `main`（または最小限のブランチ）で開発。極小チームや移行初期に向く。                                     |
| Stacked Diffs                 | Meta（旧 Facebook）／Phabricator コミュニティ（近年 Graphite/GitHub でも普及） | 依存関係のある小さな PR を**積み上げ**て順次レビュー・マージ。大きな変更を安全に分割しレビュー効率を高める手法。                             |

### Git Flow

計画的リリースと長期保守を支える“多段ブランチ”モデルです。
ブランチの種類は `main（製品）`、`develop（次版の統合）`、`feature/*`、`release/*`、`hotfix/*` があります。

基本的な開発の流れ

1. `feature/*`
2. `develop` 集約
3. リリース準備で `release/*`
4. テスト完了で `main` にマージ＆タグ
5. `develop` にも戻す
6. 緊急修正は `hotfix/*` を `main` から切って両系へ反映

**強み**

* 明確な“凍結”と“出荷”ライン
* 複数人・長期機能の並行開発がしやすい。

**注意点**

* ブランチが多く運用コストが高い
* `develop` と `main` の乖離、マージ地獄。高頻度デプロイには不向き。

**どんな時に向いている？**
パッケージ／モバイルのようにリリースを塊で出すプロダクト。

**Tips**

* `release/*` 期間を短く
* CI で `develop` と `release/*` を強制検証
* `hotfix` の両系反映を自動化


Atlassian の Git Tutorials がわかりやすいです。

{{ link(url="https://www.atlassian.com/ja/git/tutorials/comparing-workflows/gitflow-workflow", title="Gitflow ワークフロー | Atlassian Git Tutorials") }}

### GitHub Flow

GitHub Flow は GitHub のドキュメントで説明されています。

{{ link(url="https://docs.github.com/ja/get-started/using-github/github-flow", title="GitHub フロー - GitHub Docs") }}

`main` を常にデプロイ可能に保つ、短命ブランチと Pull Request 中心の軽量モデルです。
ブランチの種類は `main`、`feature/*` があります。

基本的な開発の流れ

1. `main` から `feature/*` を作成
2. こまめにコミットしてリモートへ push
3. PR を作成（レビュー＋CI）
4. 承認後に `main` へマージ（必要に応じてタグ）
5. 自動／手動で本番へデプロイ
6. マージ後に作業ブランチを削除

**強み**

* シンプルで学習コストが低い
* 継続的デリバリーに最適
* レビューと CI を前提に品質を担保しやすい

**注意点**

* 複数バージョンの並行保守には弱い
* 未完成機能は Feature Flag 前提
* `main` の保護と必須チェックがないと事故リスク

**どんな時に向いている？**
Web サービス、少人数〜中規模チーム、高頻度リリース。

**Tips**

* `main` のブランチ保護と必須ステータスチェックを有効化
* Draft PR を活用し、準備できたらレビューへ
* Squash merge＋線形履歴（linear history）を推奨

### GitLab Flow

開発ブランチと運用環境（`staging`/`production` など）をブランチや MR/Issue と連動させ、運用と開発を一体化するモデルです。
ブランチの種類は `main`、`feature/*`、環境（またはリリース）ブランチ `staging`、`production`（または `release/*`）があります。

基本的な開発の流れ

1. `feature/*` で開発
2. `main` にマージ
3. `staging` へプロモート（デプロイ・検証）
4. 問題なければ `production` へプロモート
5. 重要修正は `main` → 必要な環境ブランチへ取り込み
6. ルールに従い逆流（back‑merge）やタグで整合を保つ

**強み**

* 環境段階や運用の流れが可視化される
* Issue/MR と連動しやすく、運用主導の現場にフィット

**注意点**

* 環境ブランチ間の差分ドリフト管理が複雑
* 逆流（back‑merge）やプロモートの一方向性ルールが必須

**どんな時に向いている？**
SaaS の多段環境運用や、運用統制が強い組織。

**Tips**

* プロモートは基本「上流→下流」一方向に限定
* マージキュー（merge trains/queue）で連続マージの安全性を確保
* 環境ブランチの保護・権限を厳密化

### Trunk‑Based Development (TBD)

短命ブランチまたは直コミットで、`main`（= trunk）へ小さく高頻度に統合する“常時統合”モデルです。
ブランチの種類は `main` と、数時間〜数日で消える短命ブランチです。

基本的な開発の流れ

1. 小さな変更を作業（必要なら短命ブランチ）
2. すぐに PR／レビュー＋CI を経て `main` へ統合
3. 未完成機能は Feature Flag／Branch by Abstraction で隠す
4. `main` は常にデプロイ可能な状態を維持
5. 小刻みにデプロイし、観測とロールバックを迅速化

**強み**

* マージ負債が最小化され、リードタイムが短い
* 高頻度デリバリーと相性が良い

**注意点**

* 強力な自動テストと CI/CD、監視が前提
* 大規模改修は段階投入の設計が必要

**どんな時に向いている？**
高頻度リリース志向のプロダクト、熟練チーム、強い CI 文化。

**Tips**

* PR を小さく保つ／スタック型 PR（後述）を活用
* `main` に必須チェック（lint/test/build）を設定
* Feature Flag の作成〜削除までの運用を明文化

### OneFlow

Git Flow を簡素化し、普段はトランク（`main`）中心、必要時のみ `release/*` と `hotfix/*` を使うモデルです。
ブランチの種類は `main`、`feature/*`、必要に応じて `release/*`、`hotfix/*` があります。

基本的な開発の流れ

1. `feature/*` で開発し、短期で `main` に統合
2. リリース凍結が要るときだけ `release/*` を作成
3. 検証完了でタグ付けし `main` と整合
4. 緊急修正は `hotfix/*` → `main` へ、必要なら `release/*` にも反映
5. `release/*` は速やかにクローズ
6. 作業ブランチはマージ後に削除

**強み**

* 運用コストが低く、CD とリリース凍結の両立がしやすい

**注意点**

* `release/*` を切る基準・期間の明確化が必要

**どんな時に向いている？**
基本は CD だが、時折リリース凍結期間を設けたいプロダクト。

**Tips**

* `release/*` の滞在期間を最短化
* Squash merge＋線形履歴で履歴を整理
* タグ／リリースノートの基準を定義

### Release Flow

`main` を唯一の真実の源泉とし、各バージョンのリリース線へ必要修正を **cherry‑pick** でポートする並行保守向けモデルです。
ブランチの種類は `main`、`release/X.Y`、`hotfix/*` があります。

基本的な開発の流れ

1. すべての修正はまず `main` にマージ
2. 対象バージョンの `release/X.Y` へ cherry‑pick（バックポート）
3. 検証→タグ→配布
4. 緊急修正は `main` → 各対象 `release/*` へ展開
5. EOL のラインは計画的にクローズ
6. バックポートの履歴・ラベルで追跡

**強み**

* 複数バージョンの並行保守に強い
* 回帰を防ぎやすい（常に `main` 先行）

**注意点**

* バックポート漏れ／競合対応の運用負荷
* 自動化（ラベル、ボット、スクリプト）が鍵

**どんな時に向いている？**
LTS や旧版を長期サポートする製品群。

**Tips**

* PR に “backport-to: X.Y” などのラベル運用
* cherry‑pick 支援の自動化とチェックリスト
* リリース分岐・EOL ポリシーを明文化

### Forking Workflow

各開発者のフォーク上で作業し、PR で本家に取り込む、OSS 標準の権限分離モデルです。
ブランチの種類は（本家）`main`、（各フォーク）`feature/*` などです。

基本的な開発の流れ

1. 本家をフォークして自分のリポジトリを作成
2. ローカルで作業し、自フォークへ push
3. 本家へ PR を作成（レビュー＋CI）
4. 本家側でマージ
5. `upstream` を取り込んで自フォークを同期
6. 使い終えたブランチは削除

**強み**

* 書き込み権限を安全に分離できる
* 外部コントリビューションを受け入れやすい

**注意点**

* フォーク発 PR はシークレット制約で CI が制限される場合あり
* フォークの陳腐化に注意（頻繁な同期が必要）

**どんな時に向いている？**
OSS や社外コラボが多いプロジェクト。

**Tips**

* `upstream` リモートを設定し、定期的に rebase／pull
* CONTRIBUTING／PR テンプレ／ラベルでガイド整備
* “good first issue” 等で参加障壁を下げる

### Feature Branch Workflow

機能単位のブランチを切り、PR でレビューして統合する基本形のモデルです。
ブランチの種類は `main`（または `develop`）、`feature/*` があります。

基本的な開発の流れ

1. Issue/機能ごとに `feature/*` を作成
2. 作業後に PR（レビュー＋CI）
3. 承認後に `main` へマージ（必要ならタグ）
4. ブランチを削除
5. デプロイ
6. 変更点をリリースノートに反映

**強み**

* レビュー駆動で品質を担保
* 履歴が機能単位で追いやすい

**注意点**

* 長生きブランチは乖離・コンフリクトを招く

**どんな時に向いている？**
小〜中規模チームの一般的なプロダクト。

**Tips**

* PR を小さく保ち、頻度高く統合
* 命名規則（例：`feature/ISSUE-123-title`）を統一
* Squash merge で履歴を整理

### Centralized Workflow

単一の中央ブランチ（`main`）に変更を集約する最小構成のモデルです。
ブランチの種類は `main`（必要に応じて短命の `topic/*`）があります。

基本的な開発の流れ

1. `main` へ直接 push（または軽い PR）
2. CI でテスト・ビルド
3. 問題なければデプロイ
4. 必要に応じてタグ
5. 誤コミット時は速やかにリバート
6. 定期的にリファクタリング

**強み**

* 学習・運用コストが最小
* 極小チームや試作に向く

**注意点**

* レビュー不足や誤コミットのリスクが高い
* 品質を CI に強く依存

**どんな時に向いている？**
個人開発、極小チーム、プロトタイプ段階。

**Tips**

* 最低限のブランチ保護（必須チェック／レビュー 1 名）
* コミットフックで整形・静的解析を自動化
* 小まめなタグとリリースメモ

### Stacked Diffs

依存関係のある小さな PR を“縦に積む”ことで、大きな変更を段階的にレビュー・統合する手法です。
ブランチの種類は `feat-A` → `feat-B` → `feat-C` のように連なる短命ブランチ群です。

基本的な開発の流れ

1. 大きな変更を独立テスト可能な小 PR に分割し、チェーン化
2. 上流（親）から順にレビュー・マージ
3. 上流更新時は下流を自動／半自動でリベース
4. 各段でテストを通過
5. 最終段まで順次統合
6. 統合後は不要ブランチを削除

**強み**

* 1 PR を小粒化でき、レビューが高速・高品質
* TBD や高頻度統合と相性が良い

**注意点**

* ツールがないと運用が煩雑
* 依存関係の破綻に注意（順序と境界の管理が必要）

**どんな時に向いている？**
大規模改修の段階投入、レビューを高速化したいチーム。

**Tips**

* 各 PR は単体でテスト可能な粒度に分割
* タイトルに「Part n/m」など順序を明記
* スタック管理ツールや自動リベースを活用