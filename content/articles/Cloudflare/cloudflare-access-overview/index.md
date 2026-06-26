+++
title = "Cloudflare Access"
date = 2025-09-25
updated = 2025-09-25
draft = true
taxonomies = { tags=["Cloudflare","Cloudflare Access"], categories=["Cloudflare"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## Cloudflare Access

Cloudflare Access で使える認証方式
* WARP クライアント
* Device Posture
* クライアント証明書(mTLS)
* IPアドレス/国
* IdP
* 時間制限
* Token

### クライアント証明書(mTLS)
Mutual TLS で mTLS です。相互で認証をする TLS という意味です。
クライアント証明書とサーバー証明書をそれぞれ送信して、お互いに認証する方式です。

### Token

`CF-Access-Client-Id`
`CF-Access-Client-Secret`

### モバイルで使う場合

1. Cloudflace Access Token
2. クライアント証明書