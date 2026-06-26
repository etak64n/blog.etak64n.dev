+++
title = "Clerkの設定項目について"
date = 2025-09-10
updated = 2025-09-10
draft = false
taxonomies = { tags=["Clerk"], categories=["Clerk"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/hero-clerk.svg"
toc = true
+++

## Clerk の設定項目について
Clerk の設定項目についてまとめてみました。

Clerk Dashboard の画面上部 Configure から確認できる項目です。

{{ img(src="clerk-config-basics-hero.webp", alt="alt text") }}

### User & authentication

**Configure - User & authentication** の項目です。

{{ img(src="user-authentication-settings.webp", alt="Clerk Settings: User & authentication (settings overview)") }}

以下の6つの設定項目があります。

- `User & authentication`
- `SSO connections`
- `Web3`
- `Multi-factor`
- `Restrictions`
- `Attack protection`

各種項目について補足していきます。

#### User & authentication
**Configure - User & authentication - User & authentication** の項目です。

{{ img(src="user-authentication-options.webp", alt="Clerk Settings: User & authentication (sign-in options)") }}

Email、Phone、Username、Password などの認証方式を有効にできます。
ただし、Phone、Passkey の認証方式は Pro プランでしか使えません。

**Email の認証方式**

Email の認証方式では Sign-up (登録)、Sign-in (ログイン) の設定ができます。
- Sign-up with email
- Sign-in with email

Sign-up with email では Verify at sign-up が推奨されています。Veirfy at sign-up を有効にしていると 入力したメールアドレスに対して、verification code か verification link が送られます。
verification code の場合は、6桁の数字を確認して、フォームに入力することでユーザー登録が完了になります。
verification link の場合は、そのリンクをクリックすることでユーザー登録が完了になります。

**Password の認証方式**
最低文字数の長さなどが設定できます。

{{ img(src="password-protection-reject-compromised.webp", alt="Clerk Settings: Password protection (reject compromised passwords)") }}

**Update password requirements** をクリックすると、細かい設定ができます。

{{ img(src="password-compromised-error.webp", alt="Clerk Error: Compromised password message") }}

Password の認証で **Reject compromised passwords** という項目があります。
これは、漏洩済みパスワードを使わないようにする設定です。
もし漏洩済みパスワードを設定しようとすると `Password has been found in an online data breach. For account safety, please use a different password.` というエラーが表示されます。

Clerk は、パスワード漏洩時の取り扱いについて、NIST のガイドラインに準拠しています。
具体的な確認方法としては、Have I Been Pwned というパスワードなどの流出データを収集したデータベースと照合することで、候補のパスワードの安全性を確認します。

**Enfoce minimum password strength** の項目では、パスワードの強化を使用するために zxcvbn のライブラリを使用してチェックします。
Open Web Application Security Project (OWASP) のガイドラインによって、パスワード強度を判定します。

詳しくは Clerk のドキュメントをご確認ください。

{{ link(url="https://clerk.com/docs/security/password-protection", title="Security & Privacy: Password protection and rules") }}

#### SSO connections
**Configure - User & authentication - SSO connections** の項目です。

{{ img(src="sso-connections-overview.webp", alt="Clerk Settings: SSO connections (overview)") }}

Single Sign On で利用できるプロバイダーとして登録したものが表示されています。
今回の例だと、Google での Single Sign On ができる設定となります。

{{ img(src="sso-providers-list.webp", alt="Clerk Settings: SSO connections (providers list)") }}

利用できるプロバイダーは色々あり、さらに Custom Provider として独自に設定することもできます。

#### Web3
**Configure - User & authentication - Web3** の項目です。

{{ img(src="web3-wallets-settings.webp", alt="Clerk Settings: Web3 (wallet sign-in settings)") }}

Web3 Wallets の認証情報を用いてログインができるようです。

#### Multi-factor
**Configure - User & authentication - Multi-factor** の項目です。

{{ img(src="multi-factor-settings.webp", alt="Clerk Settings: Multi-factor (MFA settings)") }}

MFA 認証を有効にできるようです。

#### Restrictions
**Configure - User & authentication - Restrictions** の項目です。

{{ img(src="restrictions-signup-mode.webp", alt="Clerk Settings: Restrictions (sign-up mode)") }}

Sign-Up Mode として「Public」「Restricted」「Waitlist」の3種類から選べます。
Public は誰でもアプリケーションに登録することができて、Restricterd は招待されたユーザーか手動で作成されたユーザーか SSO 接続でしかアクセスできません。
Waitlist は登録はできないが、waitlist に入ることができる機能です。

{{ img(src="restrictions-allow-blocklist.webp", alt="Clerk Settings: Restrictions (allowlist/blocklist)") }}

Allowlist、Blocklist は Pro 機能でしか使えません。

#### Attack protection
**Configure - User & authentication - Attack protection** の項目です。

{{ img(src="attack-protection-settings.webp", alt="Clerk Settings: Attack protection (bot/brute-force protection)") }}

### Session Management
**Configure - Session management** の項目です。

{{ img(src="session-management-overview.webp", alt="Clerk Settings: Session management (overview)") }}

- Sessions
- JWT templates

#### Sessions
**Configure - Session management - Sessions** の項目です。

{{ img(src="sessions-overview.webp", alt="Clerk Settings: Sessions (list)") }}

{{ img(src="sessions-details.webp", alt="Clerk Settings: Sessions (details)") }}

#### JWT templates
**Configure - Session management - JWT templates** の項目です。

{{ img(src="jwt-templates-overview.webp", alt="Clerk Settings: JWT templates (overview)") }}

### Compliance
**Configure - Compliance** の項目です。

{{ img(src="compliance-overview.webp", alt="Clerk Settings: Compliance (overview)") }}

#### Legal
**Configure - Compliance - Legal** の項目です。

{{ img(src="compliance-legal.webp", alt="Clerk Settings: Compliance > Legal") }}

### Feature Management
**Configure - Feature Management** の項目です。

{{ img(src="feature-management-overview.webp", alt="Clerk Settings: Feature management (overview)") }}

#### Features
**Configure - Feature Management - Features** の項目です。

{{ img(src="feature-management-features.webp", alt="Clerk Settings: Feature management > Features") }}

### Organization management
**Configure - Organization management** の項目です。

{{ img(src="organization-management-overview.webp", alt="Clerk Settings: Organization management (overview)") }}

#### Settings

{{ img(src="organization-settings.webp", alt="Clerk Settings: Organization management > Settings") }}

#### Role Permissions

{{ img(src="organization-role-permissions.webp", alt="Clerk Settings: Organization management > Role permissions") }}

### Billing

{{ img(src="billing-overview.webp", alt="Clerk Settings: Billing (overview)") }}

#### Settings

{{ img(src="billing-settings.webp", alt="Clerk Settings: Billing > Settings") }}

#### Subscription plans

{{ img(src="billing-subscription-plans.webp", alt="Clerk Settings: Billing > Subscription plans") }}

### Customization
{{ img(src="customization-overview.webp", alt="Clerk Settings: Customization (overview)") }}

#### Account Portal
{{ img(src="customization-account-portal.webp", alt="Clerk Settings: Customization > Account portal") }}

#### Avatars

{{ img(src="customization-avatars-1.webp", alt="Clerk Settings: Customization > Avatars (1)") }}

{{ img(src="customization-avatars-2.webp", alt="Clerk Settings: Customization > Avatars (2)") }}

#### Emails

{{ img(src="customization-emails.webp", alt="Clerk Settings: Customization > Emails") }}

#### SMS

{{ img(src="customization-sms.webp", alt="Clerk Settings: Customization > SMS") }}

### Developers

{{ img(src="developers-overview.webp", alt="Clerk Settings: Developers (overview)") }}

#### API keys

{{ img(src="developers-api-keys.webp", alt="Clerk Settings: Developers > API keys") }}

#### Updates

{{ img(src="developers-updates.webp", alt="Clerk Settings: Developers > Updates") }}

#### Webhooks

{{ img(src="developers-webhooks.webp", alt="Clerk Settings: Developers > Webhooks") }}

#### Paths

{{ img(src="developers-paths-1.webp", alt="Clerk Settings: Developers > Paths (1)") }}

{{ img(src="developers-paths-2.webp", alt="Clerk Settings: Developers > Paths (2)") }}

#### Domains

{{ img(src="developers-domains.webp", alt="Clerk Settings: Developers > Domains") }}

#### OAuth applications

{{ img(src="developers-oauth-applications.webp", alt="Clerk Settings: Developers > OAuth applications") }}

#### M2M authentication

{{ img(src="developers-m2m-authentication.webp", alt="Clerk Settings: Developers > M2M authentication") }}

#### Native applications

{{ img(src="developers-native-applications.webp", alt="Clerk Settings: Developers > Native applications") }}

#### Integrations

{{ img(src="developers-integrations.webp", alt="Clerk Settings: Developers > Integrations") }}


### Applications

#### Plan and Billing

{{ img(src="applications-plan-and-billing-1.webp", alt="Clerk Settings: Applications > Plan and billing (1)") }}

{{ img(src="applications-plan-and-billing-2.webp", alt="Clerk Settings: Applications > Plan and billing (2)") }}

#### Settings

{{ img(src="applications-settings-1.webp", alt="Clerk Settings: Applications > Settings (1)") }}

{{ img(src="applications-settings-2.webp", alt="Clerk Settings: Applications > Settings (2)") }}
