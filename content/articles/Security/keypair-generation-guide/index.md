+++
title = "秘密鍵と公開鍵の発行"
date = 2025-09-24
updated = 2025-09-24
draft = true
taxonomies = { tags=["Security"], categories=["Security"] }
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
math = true
+++

## 秘密鍵と公開鍵の発行

### OpenSSL

{{ link(url="https://github.com/openssl/openssl", title="openssl/openssl: TLS/SSL and crypto library") }}

**RSA 暗号**

OpenSSL 3 系では genrsa は genpkey に置き換え推奨

```bash
openssl genpkey -algorithm RSA \
  -pkeyopt rsa_keygen_bits:2048 \
  -pkeyopt rsa_keygen_pubexp:65537 \
  -out key.pem
```

1. **引数解析（CLI）**
   `-algorithm RSA` と `-pkeyopt`（bits=2048 / pubexp=65537）を解釈。
   例：`apps/genpkey.c` の `genpkey_main()` が担当。

2. **EVP鍵生成コンテキスト作成**
   `EVP_PKEY_CTX_new_from_name(NULL, "RSA", NULL)` で「RSA の鍵生成をしたい」という抽象化コンテキストを作る。

3. **鍵生成初期化**
   `EVP_PKEY_keygen_init(ctx)` を実行。ここで「これから鍵を作る」モードに入る。

4. **パラメータ投入（-pkeyopt の反映）**
   `OSSL_PARAM` を通して `rsa_keygen_bits:2048`、`rsa_keygen_pubexp:65537` を `EVP_PKEY_CTX_set_params()` 等で設定。

5. **プロバイダ（Provider）解決・フェッチ**
   EVP が “RSA を生成できる実装” を **Provider** から取得（default / FIPS など）。
   以降は Provider 側の **keymgmt 実装**が実作業を担当。

6. **鍵生成本体の呼び出し**
   `EVP_PKEY_generate(ctx, &pkey)`（または `EVP_PKEY_keygen`）で生成開始。
   → Provider の `…_gen_init → …_gen` が動く。

7. **乱数供給（DRBG/CSPRNG）**
   内部で `RAND_bytes()` が呼ばれ、素数候補やスカラー等に使う安全な乱数を得る。

8. **素数生成（RSA）**
   `BN_generate_prime_ex()` 系で所定ビット長の **p, q** を確率的素数判定（Miller–Rabin 等）で決定。
   （マルチプライム指定があれば p, q, r… を生成）

9. **RSA 構成要素の算出**

   * $n = p \times q$
   * $\phi(n) = (p-1)(q-1)$（マルチプライム時は拡張版）
   * 公開指数 $e = 65537$（指定値）
   * 秘密指数 $d \equiv e^{-1} \pmod{\phi(n)}$ を計算
     これらを RSA 秘密鍵構造（n, e, d, p, q, …）として組み立てる。

10. **EVP\_PKEY への格納**
    生成した RSA キーを `EVP_PKEY*` にラップしてアプリ側へ返す（鍵種に依存しない共通表現）。

11. **鍵ファイルへの書き出し（PEM/PKCS#8 既定）**
    既定で **PKCS#8（`-----BEGIN PRIVATE KEY-----`）** として `key.pem` に出力。
    暗号化オプション（例：`-aes-256-cbc`）があれば、パスフレーズで PEM 暗号化して保存。
    ※ `-traditional` を使うと PKCS#1（`-----BEGIN RSA PRIVATE KEY-----`）にもできる。

12. **後処理・終了**
    コンテキストや一時オブジェクトを解放して終了。生成された `key.pem` は以後の CSR 作成・mTLS クライアント証明書作成等に利用可能。

### mkcert

### cfssl

### step-ca / step

### Java keytool

### AWS ACM Private CA

### GCP CAS

### Azure Key Vault Certificates

### HashiCorp Vault PKI

### MacOS - Keychain Access

### Apple Configurator / MDM

### YubiKey

### スマートカード