+++
title = "AIにコミットメッセージを書かせる「OpenCommit」"
date = 2025-09-16
updated = 2025-09-16
draft = true
taxonomies = { tags=["OpenAI", "ChatGPT", "GitHub", "OSS", "Tools"], categories=["Tools"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## AIにコミットメッセージを書かせる「OpenCommi」

git commit 時の Commit メッセージを考えるのが手間だったので、AI に自動で書かせるツールを探しました。
OpenCommit が良さそうだったので、紹介します。

{{ link(url="https://github.com/di-sukharev/opencommit", title="di-sukharev/opencommit") }}

### インストール手順

GitHub に手順が記載されています。

{{ link(url="https://github.com/di-sukharev/opencommit", title="di-sukharev/opencommit") }}

1. npm で opencommit をインストールします
2. OpenAI などから API キーを取得します
3. OpenCommit config にキーを設定します

**npm で opencommit をインストールします**

```sh
(๑>ᴗ<) < npm install -g opencommit
```

**OpenAI などから API キーを取得します**

省略

**OpenCommit config にキーを設定します**

```sh
(๑>ᴗ<) < oco config set OCO_API_KEY=sk-proj-tSp...
┌  COMMAND: config set OCO_API_KEY=sk-proj-tSp...
│
└  ✔ config successfully set
```

`~/.opencommit` に設定が保存されます。

```sh
(๑>ᴗ<) < cat ~/.opencommit
OCO_API_KEY=sk-proj-tSp...
OCO_MODEL=gpt-4o-mini
OCO_API_URL=undefined
OCO_API_CUSTOM_HEADERS=undefined
OCO_AI_PROVIDER=openai
OCO_TOKENS_MAX_INPUT=4096
OCO_TOKENS_MAX_OUTPUT=500
OCO_DESCRIPTION=false
OCO_EMOJI=false
OCO_LANGUAGE=en
OCO_MESSAGE_TEMPLATE_PLACEHOLDER=$msg
OCO_PROMPT_MODULE=conventional-commit
OCO_ONE_LINE_COMMIT=false
OCO_TEST_MOCK_TYPE=commit-message
OCO_OMIT_SCOPE=false
OCO_GITPUSH=true
OCO_WHY=false
OCO_HOOK_AUTO_UNCOMMENT=false
```

デフォルトだと `gpt-4o-mini` が使われるようです。

### Help

```sh
(๑>ᴗ<) < oco --help
opencommit v3.2.10

Auto-generate impressive commits in 1 second. Killing lame commits with AI 🤯🔫

Usage:
  opencommit [flags...]
  opencommit <command>

Commands:
  config            Configure opencommit settings                                     
  hook                                                                                
  commitlint                                                                          

Flags:
  -c, --context <string>        Additional user input context for the commit message  
      --fgm                     Use full GitMoji specification                        
  -h, --help                    Show help                                             
      --version                 Show version                                          
  -y, --yes                     Skip commit confirmation prompt                       
```

### 使い方

1. `git add` でファイルをステージングに追加します
2. `oco` コマンドを実行します
3. 誘導に従うと `git push` まで実行できます

```sh
(๑>ᴗ<) < oco                                                             (git)-[main]
┌  open-commit
│
◇  1 staged files:
  content/articles/2025/09/opencommit-overview/index.md
│
◇  📝 Commit message generated
│
└  Generated commit message:
——————————————————
feat(opencommit): add overview article for OpenCommit with installation steps and usage instructions
——————————————————

│
◇  Confirm the commit message?
│  Yes
│
◇  ✔ Successfully committed
│
└  [main 3e20353] feat(opencommit): add overview article for OpenCommit with installation steps and usage instructions
 1 file changed, 77 insertions(+)
 create mode 100644 content/articles/2025/09/opencommit-overview/index.md

│
◇  Do you want to run `git push`?
│  Yes
│
◇  ✔ Successfully pushed all commits to origin
```

### モデルの変更

デフォルトだと `gpt-4o-mini` が使われていました。
最近だと `gpt-5-nano` の方がだいぶ安そうです。

OpenAI API Platform のページを見ると、料金比較ができます。

{{ img(src="openai-models-comparison.webp", alt="openai-models-comparison") }}

`gpt-5-nano` で設定をしてみます。

```sh
(๑>ᴗ<) < oco config set OCO_MODEL=gpt-5-nano
┌  COMMAND: config set OCO_MODEL=gpt-5-nano
│
└  ✔ config successfully set
```

```sh
(๑>ᴗ<) < cat ~/.opencommit | grep OCO_MODEL
OCO_MODEL=gpt-5-nano
```

この設定により、`gpt-5-nano` が使われるようになります。

```sh
(๑>ᴗ<) < oco                                                             (git)-[main]
┌  open-commit
...
◇  ✖ Failed to generate the commit message
BadRequestError3: 400 Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.
```

エラーが出てしまいました。
`max_tokens` というパラメータがサポートされておらず、`max_completion_tokens` を使ってね、とのことでした。

OpenCommit が GPT5 の `max_completion_token`s` に対応していないようです。
OpenCommit の issue にもあがっていました。

{{ link(url="https://github.com/di-sukharev/opencommit/issues/510", title="[Bug]: GPT5 Doesn't Support max_token, instead use max_completion_tokens instead · Issue #510 · di-sukharev/opencommit") }}

OpenAI 側で `max_tokens` が deprecation になり、`max_completion_tokens` を使うよう変更があったようでした。

{{ link(url="https://community.openai.com/t/why-was-max-tokens-changed-to-max-completion-tokens/938077", title="Why was max_tokens changed to max_completion_tokens? - API / Feedback - OpenAI Developer Community") }}

{{ link(url="https://platform.openai.com/docs/api-reference/chat/create#chat-create-max_tokens", title="API Reference - OpenAI APIy") }}

> `max_tokens` `Deprecated` integer or null Optional
> The maximum number of tokens that can be generated in the chat completion. This value can be used to control costs for text generated via API.
> 
> This value is now deprecated in favor of max_completion_tokens, and is not compatible with o-series models.

OpenCommit のコードを見てみると OpenRouter に対して Chat Completion API (`/v1/chat/completions`) を呼び出しています。
しかし、OpenAI Chat Completion API のパラメータでは `max_tokens` が定義されていて、`max_completion_tokens` での呼び出しがされていません。

[opencommit/src/engine/openrouter.ts](https://github.com/di-sukharev/opencommit/blob/ebbaff0628cfd8ae14495bd456f9a2e8e47967c5/src/engine/openrouter.ts#L13)

```ts
  constructor(public config: OpenRouterConfig) {
    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://github.com/di-sukharev/opencommit',
        'X-Title': 'OpenCommit',
        'Content-Type': 'application/json'
      }
    });
  }
```

[opencommit/src/engine/openAi.ts](https://github.com/di-sukharev/opencommit/blob/ebbaff0628cfd8ae14495bd456f9a2e8e47967c5/src/engine/openAi.ts#L36-L45)

```ts
  public generateCommitMessage = async (
    messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>
  ): Promise<string | null> => {
    const params = {
      model: this.config.model,
      messages,
      temperature: 0,
      top_p: 0.1,
      max_tokens: this.config.maxTokensOutput
    };
```

ということで、OpenCommit が `max_completion_tokens` に対応していないので、`gpt-5-nano` はまだ使えなさそうでした。

### まとめ
`oco` コマンドにより、自動で commit メッセージを入れてくれるようになりました。
