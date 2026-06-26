+++
title = "AWS CodeCommit が帰ってきました"
date = 2025-11-25
updated = 2025-11-25
draft = false
taxonomies = { tags=["AWS","CodeCommit","Deployment"], categories=["AWS"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/hero-aws.png"
toc = true
+++

## AWS CodeCommit が帰ってきました

AWS CodeCommit は Deprecation になる予定でしたが、2025年11月24日に帰ってくることが決まりました。

{{ link(url="https://aws.amazon.com/jp/blogs/devops/aws-codecommit-returns-to-general-availability/", title="The Future of AWS CodeCommit | AWS DevOps & Developer Productivity Blog") }}

{{ link(url="https://aws.amazon.com/jp/blogs/news/aws-codecommit-returns-to-general-availability/", title="AWS CodeCommit の今後について | Amazon Web Services ブログ") }}

### 背景

2024年7月25日に AWS CodeCommit は Deprecation になることが発表されました。{% ref(url="https://docs.aws.amazon.com/codecommit/latest/userguide/history.html", title="AWS CodeCommit User Guide document history - AWS CodeCommit") %}
July 25, 2024
AWS CodeCommit is no longer available to new customers. Existing customers of AWS CodeCommit can continue to use the service as normal.
{% end %}
このタイミングから、新しく CodeCommit のリポジトリを作ることはできなくなり、コード管理は外部の Git プロバイダを使う前提になります。
実際に、GitHub・GitLab・Bitbucket へ移行するための手順を紹介した公式ブログも公開されています。{% ref(url="https://aws.amazon.com/jp/blogs/devops/how-to-migrate-your-aws-codecommit-repository-to-another-git-provider/", title="How to migrate your AWS CodeCommit repository to another Git provider | AWS DevOps & Developer Productivity Blog") %}
Customers can migrate their AWS CodeCommit Git repositories to other Git providers using several methods, such as cloning the repository, mirroring, or migrating specific branches. This blog describes a basic use case to mirror a repository to a generic provider, and links to instructions for mirroring to more specific providers.
{% end %}

そのため、たとえ AWS 上のワークロードであっても、リポジトリを使いたい場合は GitHub や GitLab などの外部サービスを使ってコード管理する、という状況になりました。

### AWS CodeCommit ってなんだっけ？

AWS CodeCommit は、Git 互換で GitHub や GitLab の代わりに使える AWS サービスとなります。

```sh
# リポジトリ作成
aws codecommit create-repository --repository-name my-repo --region ap-northeast-1

# クローン（HTTPS）
git clone https://git-codecommit.ap-northeast-1.amazonaws.com/v1/repos/my-repo

# クローン（SSH）
git clone ssh://git-codecommit.ap-northeast-1.amazonaws.com/v1/repos/my-repo

# 通常の Git 操作
git add .
git commit -m "commit message"
git push origin main
```

CodeCommit でリポジトリを作成しておいて、git で管理するイメージです。

### まとめ

CodeBuild との連携まで考えると、「どうせなら AWS の中だけで完結させたいし、CodeCommit を使いたい」というシチュエーションはけっこうありました。

ところが一度は廃止が発表されてしまい、GitHub など別サービスを使わざるを得なくなって、「管理先が増えてちょっとややこしいなぁ……」と感じていた人も多いと思います。

今回 CodeCommit が“帰ってきた”ことで、あらためてコード管理も含めて AWS 上で完結させやすくなったのは、素直に嬉しいポイントです。

とはいえ、AWS のサービスが「やっぱり廃止」「やっぱり撤回」とコロコロ変わるようだと、メインで使うのはちょっと不安なところもありますよね。
それでも、便利なところはうまく割り切って付き合っていきたいところです。