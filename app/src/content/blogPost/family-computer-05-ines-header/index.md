---
title: "ファミコンを作る 05 - iNES ヘッダー"
slug: "family-computer-05-ines-header"
date: 2025-10-28
updated: 2025-10-28
draft: true
description: ""
tags: ["Nintendo", "Game", "NES", "ファミコンを作る"]
thumbnail: null
audio: null
quizzes: []
---
## ファミコンを作る 04
本記事はファミコンを作ることを目的とした記事です。
前回はファミコンの CPU に使われたリコー製の RP2A03 (Ricoh 2A03) について理解を深めました。
今回はメモリマップとバスについて理解を深めます。

## iNES Header

iNESヘッダーの仕様は[https://www.nesdev.org/wiki/INES INES - NESdev Wiki]を見るとわかる。5byte,6byte目がそれぞれPRG ROMのサイズ、CHR ROMのサイズになっている。これを使ってカセットからそれぞれのROMデータを抽出してメモリにロードしていく。今回はiNES1.0のフォーマットだけ実装する。