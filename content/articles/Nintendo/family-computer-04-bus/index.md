+++
title = "ファミコンを作る 04 - ファミコンのメモリマップとバス"
date = 2025-10-28
updated = 2025-10-28
draft = true
taxonomies = { tags=["Nintendo","Game","NES", "ファミコンを作る"], categories=["Nintendo"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## ファミコンを作る 04
本記事はファミコンを作ることを目的とした記事です。
前回はファミコンの CPU に使われたリコー製の RP2A03 (Ricoh 2A03) について理解を深めました。
今回はメモリマップとバスについて理解を深めます。

## メモリマップとバス
CPU、PPU、Console(本体)、Cartridge(カートリッジ)、Controllers(コントローラー)という5つのアーキテクチャがどのように繋がっているか図に示します。

なお、以下の図は、一番簡単な NROM (Mapper 0) の図になっています。
NROM や Mapper 0 については後ほど解説します。

```
                 ┌───────────── Console ─────────────────────────────────────────────┐
                 │                                                                   │
   CPU (RP2A03) ─┤─ CPU Bus ($0000-$FFFF) ─┬─ 2KB CPU RAM ($0000–$07FF)              │
                 │   16 bit addressing     ├─ Unused ($0800-$1FFF, mirr $0000-$07FF) |
                 │    2^16 = 65536         ├─ PPU I/O ($2000-$2007)                  │
                 │     (0x0000–0xFFFF)     │  ├─ PPUCTRL ($2000)                     │
                 │                         │  ├─ PPUMASK ($2001)                     │
                 │                         │  ├─ PPUSTATUS ($2002)                   │
                 │                         │  ├─ OAMADDR ($2003)                     │
                 │                         │  ├─ OAMDATA ($2004)                     │
                 │                         │  ├─ PPUSCROLL ($2005)                   │
                 │                         │  ├─ PPUADDR ($2006)                     │
                 │                         │  └─ PPUDATA ($2007)                     │
                 │                         ├─ Unused ($2008-$3FFF, mirr $2000-$2007) │
                 │                         ├─ APU/IO ($4000-$4017)                   │
                 │                         │  ├─ OAM DMA ($4014)                     │
                 │                         │  ├─ APU Status ($4015)                  │
                 │                         │  └─ Controllers ($4016/$4017)     ──────│─────── Controllers
                 │                         ├─ Unused ($4018-$401F)                   │
                 │                         ├─ Expansion ($4020-$5FFF)                │
                 │                         ├─ Batetry Backup RAM ($6000-$7FFF)       │       ┌────────────────── Cartridge ────────────────┐
                 │                         ├─ Program ROM LOW ($8000-$BFFF)    ──────│──┬────│─  PRG side  (to CPU bus): PRG-ROM / PRG-RAM │
                 │                         └─ Program ROM HIGH ($C000-$FFFF)   ──────│──┘ ┌──│─  CHR side  (to PPU bus): CHR-ROM / CHR-RAM │
                 │                            ├─ NMI ($FFFA/$FFFB)                   │    |  │   Mapper: PRG/CHR bank, CIRAM mirror, IRQ   │
                 │                            └─ IRQ/BRK ($FFFE/$FFFF)               │    |  └─────────────────────────────────────────────┘   
                 │                                                                   |    |
   PPU (RP2C02) ─┤─ PPU Bus ($0000-$3FFF) ─┬─ Pattern Table LOW ($0000-$0FFF)  ──────|──┬─┘
                 │   14 bit addressing     ├─ Pattern Table HIGH ($1000-$1FFF) ──────│──┘
                 │    2^14 = 16384         ├─ NameTable 0 ($2000-$23BF)              │
                 │     (0x0000–0x3FFF)     ├─ AttributeTable 0 ($23C0-$23FF)         │
                 │                         ├─ NameTable 1 ($2400-$27BF)              │
                 │                         ├─ AttributeTable 1 ($27C0-$27FF)         │
                 │                         ├─ NameTable 2 ($2800-$2BBF)              │
                 │                         ├─ AttributeTable 2 ($2BC0-$2BFF)         │
                 │                         ├─ NameTable 3 ($2C00-$2FBF)              │
                 │                         ├─ AttributeTable 3 ($2FC0-$2FFF)         │
                 │                         ├─ Unused ($3000-$3EFF, mirr $2000-$2FFF) │
                 │                         ├─ BG Palette Table ($3F00-$3F0F)         │
                 │                         ├─ Sprite Palette Table ($3F10-$3F1F)     │
                 │                         └─ Unused ($3F20-$3FFF, mirr $3F00-$3F1F) │
                 │                                                                   │
                 └───────────────────────────────────────────────────────────────────┘
```

参考: https://tekepen.com/nes/adrmap.html

CPU（RP2A03）は、Computer Processing Unit の略で、メイン処理を行うコンピューターで PRG や RAM を読み書きし、PPU/APU/Contollers をレジスタ経由で制御します。
PPU（RP2C02）は、Picture Processing Unit の略で、描画に関する処理を行います。
Cartridge は具体的なファミコンのソフトだと思って大丈夫です。今後カート(Cart)と呼ばれることもあります。

Program ROM LOW/HIGH は PRG-ROM/RAM の論理ウィンドウとなっていて、Pattern Table LOW/HIGH は CHR-ROM/RAM の論理ウィンドウとなっています。
CPU や PPU はバスを通じて、各種レジスタにアクセスを行います。
さらにレジスタの論理ウィンドウを通して、実態となるカートリッジのデータを読み書きします。

## Mapper

## PPU
参考: https://r7kamura.com/articles/2019-01-18-nes-emulator-ppu