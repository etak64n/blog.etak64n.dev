+++
title = "OpenAI の API キーの種類について"
date = 2025-09-12
updated = 2025-09-12
draft = true
taxonomies = { tags=["OpenAI", "ChatGPT"], categories=["OpenAI"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## OpenAI の API キーの種類について

Open AI の API キーを使おうとしたら種類があってややこしかったので、整理しました。

- Organization の API Keys
- Organization の Admin Key
- Project の API Keys
- User API Keys

普段使いには Project の API Key を使えば良さそうです。
Project の API Key は、アプリに組み込んだり、ユーザーが使ったりするための API Key となります。
Organization の API Keys は Project の API Keys を横断的に見るビューのことで、そもそも Key ではありません。
Organization の Admin Key は Open AI 自体に対する API Key のことで、推論エンドポイント用の API の Key ではありません。Admin API で組織とプロジェクトを管理したり、操作したりします。

User API Keys は、Project API Keys によって置き換えられました。

{{ link(url="https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform", title="Managing projects in the API platform | OpenAI Help Center") }}



