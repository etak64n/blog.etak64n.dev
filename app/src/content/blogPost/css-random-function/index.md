---
title: "CSS でランダムな値を扱う `random()` と `random-item()` 関数"
slug: "css-random-function"
date: 2024-07-28
updated: 2024-07-28
draft: false
description: "`random()` と `random-item()` 関数は CSS でランダムな値を扱うための関数です。`random()` は範囲内のランダムな数値を、`random-item()` はリストからランダムに 1 つの値を返します。"
tags: ["CSS"]
thumbnail:
  url: "https://images.ctfassets.net/in6v9lxmm5c8/1bqQw9rxgBjXq2OvYb7nxZ/d9ba71d9cc533138ddff7430f3d8acfb/omikuji_6573.png"
  title: "omikuji 6573"
audio: null
quizzes:
  - question: "以下の `random()` 関数の引数に渡す値のうち、無効なものはどれか？"
    answers:
      - text: "random(--x, 100px, 200px)"
        correct: false
        explanation: "第 1 引数には任意のキャッシュオプションを指定することができます。"
      - text: "random(100px, 200%)"
        correct: false
        explanation: "データ型が同じであれば、単位が異なっていても問題ありません。"
      - text: "random(100px, 50deg)"
        correct: true
        explanation: "`random()` 関数の引数には同じデータ型の値を渡す必要があります。"
      - text: "random(100px, 200px, by 50px)"
        correct: false
        explanation: "任意の引数としてステップ数を指定することができます。"
---

## はじめに

`random()` と `random-item()` は、CSS でランダムな値を扱うための関数です。
これまで CSS でランダム性を表現するには JavaScript やカスタムプロパティのハックが必要でしたが、
これらの関数によって宣言的に記述できるようになります。

## `random()` 関数

`random()` 関数は最小値と最大値を引数に取り、その範囲内のランダムな数値を返します。

```css
.box {
  /* 100px 〜 200px のランダムな幅 */
  width: random(100px, 200px);
}
```

任意の第 3 引数としてステップ数を指定できます。

```css
.box {
  /* 100px, 150px, 200px のいずれか */
  width: random(100px, 200px, by 50px);
}
```

引数には**同じデータ型**の値を渡す必要があります。単位が異なっていてもデータ型が同じであれば問題ありません。

```css
.ok {
  width: random(100px, 200%); /* どちらも <length-percentage> */
}
```

## `random-item()` 関数

`random-item()` 関数は、引数に渡したリストの中からランダムに 1 つの値を返します。

```css
.card {
  background: random-item(--colors, red, green, blue);
}
```

## おわりに

`random()` / `random-item()` により、CSS だけで宣言的にランダム性を表現できます。
理解度を下のクイズで確認してみてください。
