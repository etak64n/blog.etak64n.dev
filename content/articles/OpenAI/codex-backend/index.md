+++
title = "Codex のタスク処理の裏側を調べてみた"
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

## Codex のタスク処理の裏側を調べてみた

OpenAI の Codex がタスクを処理する際の環境について解説します。

詳しくは Codex のドキュメントをご確認ください。

{{ link(url="https://developers.openai.com/codex/cloud", title="Codex cloud") }}

{{ link(url="https://developers.openai.com/codex/cloud/environments", title="Cloud environments") }}

Codex のフェーズは主に4つに分かれます。

1. プロビジョニング
2. セットアップ
3. エージェント実行
4. 終了

### プロビジョニング

タスク専用のサンドボックスクラウドコンテナを起動して、環境のリポジトリを用意します。
**環境ごとに作成されるのではなく、タスクごとに作成されます。**

デフォルトでは [universal](https://github.com/openai/codex-universal) と呼ばれるコンテナイメージを使用します。
[universal](https://github.com/openai/codex-universal) は、一般的な言語、パッケージ、ツールがプリインストールされています。

{{ link(url="https://developers.openai.com/codex/cloud", title="Codex cloud") }}
> When you start a cloud task, Codex provisions a sandboxed cloud container for just that task, provisioned with the code and dependencies you can specify in an environment. This means Codex can work in the background, on many tasks in parallel, and can be triggered from different devices or services such as your phone or GitHub.

{{ link(url="https://developers.openai.com/codex/cloud/environments", title="Cloud environments") }}
> ### Default universal image
> The Codex agent runs in a default container image called universal, which comes pre-installed with common languages, packages, and tools.
> Set package versions in environment settings can be used to configure the version of Python, Node.js, etc.

{{ link(url="https://github.com/openai/codex-universal", title="openai/codex-universal: Base docker image used in Codex environments") }}
> codex-universal is a reference implementation of the base Docker image available in OpenAI Codex.

### セットアップ

コンテナが起動した後は、**環境変数**と**シークレット**が設定されて、**セットアップスクリプト**が実行されます。

**環境変数**は、タスク実行中の全てのフェーズで設定されます。
**シークレット**は、環境変数のように使えますが、暗号化レイヤーで保持されています。
タスク実行時の**セットアップフェーズでのみ**復号して使用することができて、エージェントが動作する時には環境から削除されます。

**セットアップスクリプト**には2種類あります。
1. **Automatic setup**
2. **Manual setup**

**Automatic setup** は、Codex が自動的に判断して依存関係やツールなどをインストールします。
**Manual setup** は、ユーザーが事前に定義したカスタムセットアップスクリプトを実行して、依存関係やツールなどをインストールします。

**セットアップ中**は、依存関係やツールのインストールのために**インターネットアクセスができる状態**になっています。
インターネットアクセスには HTTP/HTTPS プロキシを設定することもできます。

{{ link(url="https://developers.openai.com/codex/cloud/environments", title="Cloud environments") }}
> ### How Codex cloud tasks work
> Under the hood, here’s what happens when you submit a task:
> 1. We prepare a containerized environment with, your repo’s code at the desired branch or sha, and your setup & maintenance scripts.

{{ link(url="https://developers.openai.com/codex/cloud/environments", title="Cloud environments") }}
> ### Environment variables and secrets
> **Environment variables** can be specified and are set for the full duration of the task.
> **Secrets** can also be specified and are similar to environment variables, except:
> * They are stored with an additional layer of encryption and are only decrypted for task execution.
> * They are only available to setup scripts. For security reasons, secrets are removed from the environment when the agent is running.

{{ link(url="https://developers.openai.com/codex/cloud/environments", title="Cloud environments") }}
> #### Automatic setup
> For projects using common package managers (npm, yarn, pnpm, pip, pipenv, and poetry), Codex can automaticaly install dependencies and tools.
> #### Manual setup
> If your development setup is more complex, you can also provide a a custom setup script.

{{ link(url="https://developers.openai.com/codex/cloud/environments", title="Cloud environments") }}
> ### Internet access and network proxy
> Internet access is available to install dependencies during the setup script phase. During the agent phase, the network access is disabled by default, but you can configure the environment to have limited or full access to the internet. Learn more about configuring your agent’s internet access.
> Environments run behind an HTTP/HTTPS network proxy for security and abuse prevention purposes. All outbound internet traffic passes through this proxy.

### エージェント実行

セットアップが終了したら依頼されたタスクを元にエージェントが処理を進めていきます。

**エージェント実行中**は、**環境変数**を参照することができますが、**シークレット**は参照できません。
また、**エージェント実行中**、**デフォルトではインターネットアクセスは無効**になっています。

{{ link(url="https://developers.openai.com/codex/cloud/environments", title="Cloud environments") }}
> ### Environment variables and secrets
> **Environment variables** can be specified and are set for the full duration of the task.
> **Secrets** can also be specified and are similar to environment variables, except:
> * They are stored with an additional layer of encryption and are only decrypted for task execution.
> * They are only available to setup scripts. For security reasons, secrets are removed from the environment when the agent is running.

{{ link(url="https://developers.openai.com/codex/cloud/environments", title="Cloud environments") }}
> ### Internet access and network proxy
> Internet access is available to install dependencies during the setup script phase. During the agent phase, the network access is disabled by default, but you can configure the environment to have limited or full access to the internet. Learn more about configuring your agent’s internet access.
> Environments run behind an HTTP/HTTPS network proxy for security and abuse prevention purposes. All outbound internet traffic passes through this proxy.

### 終了

タスクが終了したらサンドボックスは削除されます。

## まとめ

| フェーズ                    | 何が起きるか                                              | ネットワーク                  | 環境変数 (Env)          | シークレット (Secrets)    |
| ----------------------- | --------------------------------------------------- | ----------------------- | ------------------- | ------------------- |
| 0. プロビジョニング             | そのタスク専用のサンドボックス（コンテナ）を起動し、リポジトリ等を用意                 | —                       | （設定済みのものが投入される準備段階） | （同左）                |
| 1. セットアップ（setup script） | 事前に定義した **setup script** が実行され、依存関係のインストールやツール準備を行う | **基本オン（フル）**            | **参照可**             | **参照可**（※このフェーズのみ）  |
| 2. エージェント実行（agent run）  | Codex がコードを読み書き・テスト実行などを行う                          | **既定はオフ**（必要に応じて許可/制限可） | **参照可**             | **参照不可**（環境から除去される） |
| 3. 出力・終了                | 変更差分の提示、PR作成、（必要に応じて）GitHubレビュー連携                   | 設定に依存                   | —                   | —                   |
