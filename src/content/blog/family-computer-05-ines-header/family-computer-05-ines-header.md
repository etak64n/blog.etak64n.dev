---
title: ファミコンを作る 05 - iNES ヘッダー
description: ""
date: 2025-10-28
tags:
  - make-famicom
  - nes
  - nintendo
  - game
draft: true
---

## ファミコンを作る 04
本記事はファミコンを作ることを目的とした記事です。
前回はファミコンの CPU に使われたリコー製の RP2A03 (Ricoh 2A03) について理解を深めました。
今回はメモリマップとバスについて理解を深めます。

## iNES Header

iNESヘッダーの仕様は[INES - NESdev Wiki](https://www.nesdev.org/wiki/INES)を見るとわかる。5byte,6byte目がそれぞれPRG ROMのサイズ、CHR ROMのサイズになっている。これを使ってカセットからそれぞれのROMデータを抽出してメモリにロードしていく。今回はiNES1.0のフォーマットだけ実装する。