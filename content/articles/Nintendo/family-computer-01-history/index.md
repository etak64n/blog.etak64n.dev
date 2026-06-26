+++
title = "ファミコンを作る 01 - ファミコンの歴史"
date = 2025-10-25
updated = 2025-10-25
draft = true
taxonomies = { tags=["Nintendo","Game","NES", "ファミコンを作る"], categories=["Nintendo"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## ファミコンを作る 01
本記事は、ファミコンを作ることを目的とした記事です。
ファミコンを作るにあたり、まずはファミコンが生まれた歴史から振り返ります。

## ファミコンの歴史
ファミリーコンピューター(通称ファミコン)は、任天堂より1983年7月15日に発売された家庭用ゲーム機です。

![Nintendo Famicom Console Set (Public Domain)](https://upload.wikimedia.org/wikipedia/commons/4/4c/Nintendo-Famicom-Console-Set-FL.png)  
出典：[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Nintendo-Famicom-Console-Set-FL.png)

### 任天堂がファミコンを作ろうとした背景

任天堂がファミコン（Family Computer）を作ろうとした背景として、以下3点が挙げられます。
- アーケードの成功を家のテレビに持ち込みたい
- 家族みんなで遊べる玩具らしい据置機を、手の届く価格で
- 長く儲かるのは本体よりソフトのビジネス

任天堂は、1977年の据置型「Color TV-Game」（6種類のバリエーションを搭載した専用ゲーム機）、1980年の携帯型「ゲーム＆ウオッチ」で大ヒットし、当時社長だった山内溥とコンシューマー・エレクトロニクス・ショーに頻繁に足を運ぶようになりました。
その後、1981年に「ドンキーコング」が世界的にヒットし、山内氏が上村氏を呼び出して「家のテレビでアーケードゲームが遊べるものを作ってくれ」と言ったことからNintendo R&D2 の上村雅之が開発を主導し、ファミコンを作ることになりました。
{% ref(url="https://www.polygon.com/2013/7/10/4510068/the-famicoms-creator-reflects-on-30-years-of-8-bit-bliss/", title="The Famicom's creator reflects on 30 years of 8-bit bliss") %}
"I suppose those CES visits were him setting up the project for us, looking back," Uemura said. "One day, Yamauchi called me in and said 'Make me something that lets you play arcade games on your TV at home.' Donkey Kong was a huge hit in the arcades by then, and I suppose he wanted to get our name into homes as well. His reasoning was that, after all, we were a company that started with playing cards and got into toys later on, so unless we did something that no one's done before, it wouldn't have much value as a product."
{% end %}

名称は「パーソナル／ホーム」ではなくファミリーに。リビングに置いて家族で遊ぶ姿を想定したネーミングで、社内外インタビューにもこの発想が語られています。外観の赤×白配色にも山内の強い意向がありました。
{% ref(url="https://soranews24.com/2013/04/30/famicom-creator-masayuki-uemura-had-no-faith-in-the-game-systems-success-colored-it-after-his-boss-scarf/", title="Famicom Creator Masayuki Uemura Had No Faith in the Game System’s Success, Colored it After His Boss’ Scarf | SoraNews24 -Japan News-") %}
The name “Family Computer” was chosen by Uemura himself.  At that time Nintendo had its developers choose the name of its products rather than the marketing department. He often would hear the terms “personal computer” or “home computer” but liked the idea of a “family computer” and could envision a family gathered in the living room playing his machine together.
{% end %}

### 任天堂がリコーと組んだ背景
偶然にもリコーから任天堂へ電話がかかり、家庭用ゲーム機を作りたい任天堂と大規模集積回路の工場の稼働率を上げたいリコーの思惑が重なり、ファミコンにリコー製の半導体が使われることになりました。

- 任天堂側の状況
  - 任天堂は「ドンキーコングを家庭用で動かす」ことを目標に家庭用ゲーム機を作ることにした {% ref(url="https://www.nintendo.com/en-gb/Iwata-Asks/Super-Mario-Bros-25th-Anniversary/Vol-2-NES-Mario/1-Bringing-Video-Games-Home/1-Bringing-Video-Games-Home-215978.html", title="Iwata Asks | 1. Bringing Video Games Home | Super Mario Bros. 25th Anniversary | Nintendo UK") %}
He said the games wouldn’t be built-in, but rather we would adopt the cartridge system, which was just then becoming mainstream. What’s more, he told me to make a machine that wouldn’t have any competitors for three years.
{% end %}
  - 任天堂は、玩具メーカーであり、半導体製造の設計・製造能力がなかった
  - 任天堂は、ファミコンという家庭用ゲーム機を売り出すために半導体の大量生産が必要だった
  - ゲーム&ウォッチの CPU を作成していたシャープと関係性を持っていたが、シャープの製造ラインの関係からこれ以上の生産が現実的ではなかった {% ref(url="https://www.nintendo.com/en-gb/Iwata-Asks/Super-Mario-Bros-25th-Anniversary/Vol-2-NES-Mario/1-Bringing-Video-Games-Home/1-Bringing-Video-Games-Home-215978.html", title="Iwata Asks | 1. Bringing Video") %}
He said that if we asked Sharp to put their efforts toward this, they wouldn’t be able to keep making Game & Watch games anymore.
{% end %}
  - 大手家電メーカーに連絡したが、どこも開発を受けてもらえなかった {% ref(url="https://www.nintendo.com/en-gb/Iwata-Asks/Super-Mario-Bros-25th-Anniversary/Vol-2-NES-Mario/1-Bringing-Video-Games-Home/1-Bringing-Video-Games-Home-215978.html", title="Iwata Asks | 1. Bringing Video") %}
so I started looking for someone to cooperate with and contacted many of the major electronics makers, but they all said no.
{% end %}
  - たまたまリコーから電話がかかってきた {% ref(url="https://www.nintendo.com/en-gb/Iwata-Asks/Super-Mario-Bros-25th-Anniversary/Vol-2-NES-Mario/1-Bringing-Video-Games-Home/1-Bringing-Video-Games-Home-215978.html", title="Iwata Asks | 1. Bringing Video") %}
And then, just when I was wondering what to do, completely by chance, I got a call from Ricoh.
{% end %}
- リコー側の状況
  - リコーは1970年代から大規模集積回路事業に進出していたものの、NEC や日立のような大手に比べて販売先が限られ、需要先を探していた
  - リコーの工場の稼働率が10%で困っていた {% ref(url="https://www.nintendo.com/en-gb/Iwata-Asks/Super-Mario-Bros-25th-Anniversary/Vol-2-NES-Mario/2-Playing-Donkey-Kong-at-Home/2-Playing-Donkey-Kong-at-Home-216037.html
", title="Iwata Asks | 2. Playing Donkey Kong at Home | Super Mario Bros. 25th Anniversary | Nintendo UK") %}
At that time, Ricoh had a semiconductor factory with the most advanced facilities, but they were having trouble because the operating rate wouldn’t go up. They wanted me to go take a look at it and see if there was any way we could use it. At the time, that factory was only operating at 10% capacity.
{% end %}
  - リコーは任天堂の要求に合わせて、オリジナルの CPU を作成し、大量生産することとなった

### 任天堂からリコーへの要求

任天堂は、リコーへ以下の要求を行いました。

- アーケード版「ドンキーコング」を小さなワンチップで再現させること {% ref(url="https://www.nintendo.com/en-gb/Iwata-Asks/Super-Mario-Bros-25th-Anniversary/Vol-2-NES-Mario/2-Playing-Donkey-Kong-at-Home/2-Playing-Donkey-Kong-at-Home-216037.html
", title="Iwata Asks | 2. Playing Donkey Kong at Home | Super Mario Bros. 25th Anniversary | Nintendo UK") %}
you asked if he could put the arcade version of Donkey Kong that ran on the large arcade circuit boards with lots of integrated circuits into a small, one-chip device.
{% end %}
- 家庭用でアーケード級の映像や音を実現し、安価に量産すること
- 競合に3年は追いつかれない機械を作ること

リコーのエンジニアたちは新しい技術に挑戦することに飢えていて、さらにゲーマーだったエンジニアはドンキーコングを扱える、ということが大きく、リコーはファミコン用の新しい CPU を作成することになりました。

## まとめ
今回は、ファミコンが生まれた歴史について調べてみました。
次回は、ファミコンに使用されている CPU について深掘りします。
