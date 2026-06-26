+++
title = "RSA 暗号のアルゴリズム"
date = 2025-09-24
updated = 2025-09-24
draft = true
taxonomies = { tags=["Security","Algorithm"], categories=["Security"] }
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
math = true
+++

## RSA 暗号のアルゴリズム

1. **素数を選ぶ**

   * $p = 11$
   * $q = 13$

2. **n を計算**

   $$
   n = p \times q = 11 \times 13 = 143
   $$

3. **φ(n) を計算**

   $$
   \varphi(n) = (p-1)(q-1) = 10 \times 12 = 120
   $$

4. **公開指数 e を選ぶ**

   * よく使う 65537 は大きいので、小さい例では $e = 7$ を選択。
   * 条件：$\gcd(e, \varphi(n)) = 1$。ここで $\gcd(7,120) = 1$ なのでOK。

5. **秘密指数 d を求める**
   $e \times d \equiv 1 \pmod{\varphi(n)}$ を満たす $d$ を探す。

   * 7 × 103 = 721
   * 721 ÷ 120 = 6 余り 1
     → $d = 103$

6. **鍵の完成**

   * 公開鍵: $(e, n) = (7, 143)$
   * 秘密鍵: $(d, n) = (103, 143)$

動作確認（暗号化・復号）

* 平文 $m = 9$ を暗号化：

  $$
  c = m^e \bmod n = 9^7 \bmod 143 = 48
  $$

* 復号：

  $$
  m' = c^d \bmod n = 48^{103} \bmod 143 = 9
  $$
