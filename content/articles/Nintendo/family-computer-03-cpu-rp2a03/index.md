+++
title = "ファミコンを作る 03 - ファミコン CPU 解説 Ricoh 2A03 編"
date = 2025-10-27
updated = 2025-10-27
draft = true
taxonomies = { tags=["Nintendo","Game","NES", "ファミコンを作る"], categories=["Nintendo"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## ファミコンを作る 03
本記事はファミコンを作ることを目的とした記事です。
前回はファミコンの CPU のベースとなった MOS 6502 について理解を深めました。
今回は実際にファミコンの CPU に使われたリコー製の RP2A03 (Ricoh 2A03) とファミコンのアーキテクチャについて理解を深めます。

## Ricoh 2A03
ファミコンに使用されている CPU は、リコー製の RP2A03 (Ricoh 2A03) です。
これは、任天堂とリコーが共同開発して、リコーが製造した 8 Bit CPU となります。
アメリカの MOS Technology, Inc. という半導体メーカーが作成した MOS 6502 をベースにしています。

### MOS 6502 からのカスタマイズ

- BCD(十進数モード) の演算機能の削除
  - Bincary-coded decimal, BCD で、十進数を二進数で表現する BCD モードの無効化
  - ゲーム用途では必要ない、かつ、特許やライセンスのリスクを回避することが目的だったとされています。
{% ref(url="https://ja.wikipedia.org/wiki/Ricoh_2A03", title="Ricoh 2A03
") %}
2A03はオリジナルの6502に比べて、二進化十進表現 (BCD) の演算機能が削除されている。これは、6502を開発したモステクノロジーが持つ特許の侵害を回避する狙いがあると考えられた。当時、モステクノロジーはコモドールの子会社であり、コモドールもコモドール64といったコンピュータゲーム機を開発していたため、任天堂とは競合する存在だった。
{% end %}
{% ref(url="https://www.nesdev.org/wiki/2A03", title="2A03 - NESdev Wiki
") %}
It consists of a MOS Technology 6502 processor (lacking decimal mode) and audio, joypad, and DMA functionality.
{% end %}
{% ref(url="https://retrocomputing.stackexchange.com/questions/2592/what-is-the-relationship-between-the-ricoh-2a03-and-the-mos-6502", title="nes - What is the relationship between the Ricoh 2A03 and the MOS 6502? - Retrocomputing Stack Exchange") %}
The BCD functionality of the 6502 was not useful for the NES, since there was no requirement to interface to a 7-segment display. The main reason for removing the functionality was probably to avoid any licensing or royalty issues related to U.S. Patent 3991307 held by MOS at the time.
{% end %}
- 音源機能 APU (Audio Processing Unit) の追加
  - 6502 には音源機能はないが、RP2A03 には内臓音源回路が統合されており、複数の音源チャンネル(矩形波、三角波、ノイズ、DPCM など)を提供しています。
  - ゲーム機には音楽が必須のため、別チップにせずに回路に統合することで、回路を簡素化、低コスト化することが目的
- I/O レジスタ (メモリマップ I/O) の追加
  - RP2A03 は 22 個のメモリマップ I/O レジスタ を持ち、APU操作、ジョイスティック読み取り、DMA 機能などを内蔵
  - CPU と音源・入出力制御を一体化させて、基盤設計を簡単にする目的
  - 外付け回路を減らし、基板設計を簡素化できる。これは家庭用ゲーム機ではコスト競争力を保つ
- DMA（Direct Memory Access）機能 の追加
  - RP2A03 は簡易 DMA 機能を内包し、OAM（オブジェクト／スプライト情報）転送など用途で使われる
  - グラフィック表示との同期や VRAM／スプライト転送を効率化するため
- クロック／タイミング／バグ修正
  - RP2A03 ではクロック分周やサウンドサンプリング周波数制御、DMA 整合性、IRQ／割り込みタイミングなどの修正・調整がなされている
  - ゲーム機用途に適したタイミング制御、テレビの垂直同期との整合、ノイズ除去等を目的
  - テレビ出力（映像の垂直同期、走査線周期）との同期、スプライト転送タイミング、サウンドサンプリング周期など、ゲーム描画・音源処理を効率よく同期させる仕組みが必要。標準の 6502 だけでは不十分なタイミング制御を、ASIC（Application-Specific Integrated Circuit）として整備する必要があった。
- テスト機能・未実装機能
  - RP2A03 の内部には、APU テスト機能や未完成 IRQ タイマ機能の残留回路（通常は使用不可状態）などが見られる
  - 製造時のデバッグ用機能や将来拡張を見据えた余地を残した可能性がある

### RP2A03 の CPU 内部レジスタ

| レジスタ名                             | ビット幅   | 用途 / 機能                                                                                                                                                                                                                                           |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A（Accumulator）**                | 8 bit  | 加算／論理演算などの主演算用レジスタ。メモリから読み込んだり、演算結果をここに置いたり。                                                                                                                                                                                                      |
| **X（Index レジスタ）**                 | 8 bit  | 配列アクセス、アドレッシング補助、ループ制御などに使う。                                                                                                                                                                                                                      |
| **Y（Index レジスタ）**                 | 8 bit  | X と同様、別の用途で使われる補助レジスタ。                                                                                                                                                                                                                            |
| **PC（Program Counter）**           | 16 bit | 次に実行する命令のアドレスを指す。命令フェッチ時にこの値を使う。                                                                                                                                                                                                                  |
| **SP（Stack Pointer）**             | 8 bit  | スタック操作（PHA, PLA, JSR/RTS, 割り込み処理など）で使われる。スタックはページ \$0100–\$01FF に配置されるのが通例。                                                                                                                                                                       |
| **P（Processor Status／ステータスレジスタ）** | 8 bit  | 各種フラグを含む：<br>- N (Negative)<br>- V (Overflow)<br>- (unused / always 1 bit) <br>- B (Break flag) <br>- D (Decimal mode flag) — ただし RP2A03 では十進モード機能が無効化されているため実質使われない ([nesdev.org][1]) <br>- I (Interrupt Disable) <br>- Z (Zero) <br>- C (Carry) |

[1]: https://www.nesdev.org/wiki/CPU_ALL "CPU ALL - NESdev Wiki"

CPU ALL - NESdev Wiki
https://www.nesdev.org/wiki/CPU_ALL

### RP2A03 のメモリマップド I/O レジスタ

| アドレス範囲          | 用途・備考                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| \$0000 – \$1FFF | **内部 RAM（2 KB）**。ただし、この領域はミラーリングされて、\$0000–\$07FF が実体、\$0800–\$0FFF、\$1000–\$17FF、\$1800–\$1FFF にミラーされる |
| \$2000 – \$2007 | PPU（映像描画ユニット）との通信レジスタ（PPU レジスタ）                                                                                            |
| \$2008 – \$3FFF | PPU レジスタのミラーリング（\$2000–\$2007 の繰り返し）                                                                                       |
| \$4000 – \$4017 | **APU および I/O（コントローラ入力など）用のメモリマップ I/O レジスタ**。22 個が定義されている。                                               |
| \$4018 – \$401F | 通常は未使用（テスト用や未完成機能用の領域）                                                                                    |
| \$4020 – \$FFFF | ゲームカートリッジ（ROM や拡張回路）のマップ可能領域（カートリッジのマッパー回路により制御）                                                        |

CPU ALL - NESdev Wiki
https://www.nesdev.org/wiki/CPU_ALL

### RP2A03 の命令セット　

Instruction reference - NESdev Wiki
https://www.nesdev.org/wiki/Instruction_reference

## NES エミュレーターを作るとは？

エミュレーター開発とは、実際のハードウェア（CPU・メモリ・PPU・APUなど）の動作をソフトウェア上で再現することです。

プログラム内でCPUのレジスタ（A, X, Y, SP, PCなど）を変数として持ち、各種命令セット（LDA, STA, ADC など）を実装します。
与えられたゲームプログラム（ROMデータ）を読み込み、その中の命令を1つずつ解釈して擬似CPUが動作します。
命令の内容に応じてレジスタやメモリの値を変更し、グラフィックやサウンドチップ（PPU/APU）と連携してゲームを再現します。

つまり、プログラムの中で「仮想ファミコン」を作ることがエミュレーター開発の目的です。

## サンプルプログラム

https://www.tekepen.com/nes/sample.html

- Hello, World!
- TkShoot
- MapWalker