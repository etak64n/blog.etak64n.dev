+++
title = "Codex コーディング Tips"
date = 2025-09-17
updated = 2025-09-17
draft = true
taxonomies = { tags=["OpenAI", "codex"], categories=["OpenAI"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## Codex コーディング Tips

### ChatGPT の Web UI の Codex からタスクを依頼する 

1. ChatGPT の Web UI の Codex からタスクを依頼する
2. Codex が環境を作成して、タスクを処理
3. Codex が PR を作成
4. GitHub 上で PR が生成される
5. ローカルでブランチを切り替える
6. ローカルで実行
7. 人間が操作感を確認
8. PR にレビューを残す（Approve or コメント）
9. Squash マージ（コミット履歴をキレイに）

**4. GitHub 上で PR が生成される**
https://github.com/etak64n/decklet/pull/2

**5. ローカルでブランチを切り替える**

```
gh checkout <PR Number>
```

**6. ローカルで実行**

```sh
(๑>ᴗ<) < gh pr checkout 2                                          (git)-[main]
remote: Enumerating objects: 11, done.
remote: Counting objects: 100% (11/11), done.
remote: Compressing objects: 100% (5/5), done.
Unpacking objects: 100% (6/6), 569 bytes | 56.00 KiB/s, done.
remote: Total 6 (delta 4), reused 1 (delta 0), pack-reused 0 (from 0)
From github.com:etak64n/decklet
 * [new branch]      codex/align-home-screen-panels-symmetrically -> origin/codex/align-home-screen-panels-symmetrically
branch 'codex/align-home-screen-panels-symmetrically' set up to track 'origin/codex/align-home-screen-panels-symmetrically'.
Switched to a new branch 'codex/align-home-screen-panels-symmetrically'

(๑>ᴗ<) < npm run dev       (git)-[codex/align-home-screen-panels-symmetrically]
...
⎔ Starting local server...
[wrangler:info] Ready on http://localhost:8787
```

**8. PR にレビューを残す（Approve or コメント）**

※ GitHub では自分で Approve できないので gh pr review --approve が実施できません

```sh
(๑>ᴗ<) < gh pr review 2 --comment -b "ローカルで動作確認済み"
- Reviewed pull request etak64n/decklet#2
```

**9. Squash マージ（コミット履歴をキレイに）**

```sh
(๑>ᴗ<) < gh pr merge 2 --squash --delete-branch
✓ Squashed and merged pull request etak64n/decklet#2 (Adjust home panel grid layout)
remote: Enumerating objects: 11, done.
remote: Counting objects: 100% (11/11), done.
remote: Compressing objects: 100% (5/5), done.
remote: Total 6 (delta 4), reused 1 (delta 0), pack-reused 0 (from 0)
Unpacking objects: 100% (6/6), 1.20 KiB | 617.00 KiB/s, done.
From github.com:etak64n/decklet
 * branch            main       -> FETCH_HEAD
   eb5ae02..898319a  main       -> origin/main
Updating eb5ae02..898319a
Fast-forward
 frontend/src/layout.css    | 10 ++++++++++
 frontend/src/vite-env.d.ts |  1 -
 2 files changed, 10 insertions(+), 1 deletion(-)
✓ Deleted local branch codex/align-home-screen-panels-symmetrically and switched to branch main
✓ Deleted remote branch codex/align-home-screen-panels-symmetrically
```

### issue から Codex に依頼する

1. GitHub で issue を作成する
2. ChatGPT の Web UI の Codex からタスクを依頼する
3. Codex が環境を作成して、タスクを処理
4. Codex が PR を作成
5. GitHub 上で PR が生成される
6. ローカルでブランチを切り替える

**2. ChatGPT の Web UI の Codex からタスクを依頼する**

```
https://github.com/etak64n/decklet/issues/3
この issue を解決してください。
```

※ Codex はプライベートリポジトリの issue を参照することができません。
1. Issue本文をそのまま貼る
いちばん簡単。Issueの「タイトル/本文/受入基準/コードポインタ」だけをコピペして Codex に渡す。
機密を含む部分は伏せる or 要約して渡す。

2. GitHub APIでIssueを取得→Codexに渡す（推奨）
あなたのマシン or CI で 認証つきでIssueを読み、本文だけをCodexに投入。
例（ローカル・ワンライナー）
export GITHUB_TOKEN=<fine-grained-PAT(repo:read)>
gh api repos/<owner>/<repo>/issues/<num> --jq '{title:.title, body:.body}' > /tmp/issue.json
cat /tmp/issue.json  # ← 中身を確認してからプロンプトに貼る
Node.js で自動化するなら（PAT or GitHub Appで認証）Issue本文→OpenAIに投げる小スクリプトを作るのがベスト。

3. GitHub App / Action で“社内サイド”から呼ぶ
PR/Issueに label: codex-ready が付いたら、GitHub Actions が gh api で本文を取ってきて、**自分のサーバ（または社内OpenAIプロキシ）**へ送る。
LLMには本文のみを渡し、URLやトークンは出さない。
これなら人為的なコピペが不要で再現性も◎。

NG: Codex のシークレットで GitHub の鍵を持たせる

### ブランチを切ってから Codex に依頼する

**こんなときに特に有効**

1. 既存大規模リポの 一部分だけ直すとき
2. 実験的変更を隔離したいとき
3. 並行タスクを複数回すとき（ブランチごとにCodex依頼）

**手順**

1. Issue を作成する
2. 人間がブランチを作成する
3. Codex でローカルでブランチを指定して依頼
4. PR にレビューを残す（Approve or コメント）
5. Squash マージ（コミット履歴をキレイに）

**2. 人間がブランチを作成する**

```sh
git checkout -b 'feat/play-layout-#6'
git push -u origin 'feat/play-layout-#6'
```


**4. PR にレビューを残す（Approve or コメント）**

※ GitHub では自分で Approve できないので gh pr review --approve が実施できません

```sh
(๑>ᴗ<) < gh pr review 2 --comment -b "ローカルで動作確認済み"
- Reviewed pull request etak64n/decklet#2
```

**5. Squash マージ（コミット履歴をキレイに）**

```sh
(๑>ᴗ<) < gh pr merge 2 --squash --delete-branch
✓ Squashed and merged pull request etak64n/decklet#2 (Adjust home panel grid layout)
remote: Enumerating objects: 11, done.
remote: Counting objects: 100% (11/11), done.
remote: Compressing objects: 100% (5/5), done.
remote: Total 6 (delta 4), reused 1 (delta 0), pack-reused 0 (from 0)
Unpacking objects: 100% (6/6), 1.20 KiB | 617.00 KiB/s, done.
From github.com:etak64n/decklet
 * branch            main       -> FETCH_HEAD
   eb5ae02..898319a  main       -> origin/main
Updating eb5ae02..898319a
Fast-forward
 frontend/src/layout.css    | 10 ++++++++++
 frontend/src/vite-env.d.ts |  1 -
 2 files changed, 10 insertions(+), 1 deletion(-)
✓ Deleted local branch codex/align-home-screen-panels-symmetrically and switched to branch main
✓ Deleted remote branch codex/align-home-screen-panels-symmetrically
```

git checkout main
git branch
git branch -D 'feat/play-layout-#6'