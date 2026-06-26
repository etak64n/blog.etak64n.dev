+++
title = "Base64 について"
date = 2025-09-23
updated = 2025-09-23
draft = true
taxonomies = { tags=["Security"], categories=["Security"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## Base64 について

Base64 はエンコード方式の1つで、RFC 4848 で定義されています。

{{ link(url="https://datatracker.ietf.org/doc/html/rfc4648", title="RFC 4648 - The Base16, Base32, and Base64 Data Encodings") }}

## 特徴
* `A–Z`, `a–z`, `0–9`,`+`,`/` の64文字で構成される
* `=` は Padding として使われる
* 可逆性のあるエンコード方式で、機密性は担保しない

## Examples

```sh
(๑>ᴗ<) < printf '%s' '日本語ABC' | base64
5pel5pys6KqeQUJD

(๑>ᴗ<) < printf '%s' '5pel5pys6KqeQUJD' | base64 -D
日本語ABC
```

```sh
(๑>ᴗ<) < printf '%s' '日本語ABC' | openssl base64 -A
5pel5pys6KqeQUJD

(๑>ᴗ<) < printf '%s' '5pel5pys6KqeQUJD' | openssl base64 -d -A
日本語ABC
```