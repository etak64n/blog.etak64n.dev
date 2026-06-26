+++
title = "ECS Managed Instance"
date = 2025-10-07
updated = 2025-10-07
draft = true
taxonomies = { tags=["AWS","ECS"], categories=["AWS"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## ECS Managed Instance
ECS のアップデートとして、2025年9月30日に、ECS Managed Instance が発表されました。

{{ link(url="https://aws.amazon.com/jp/about-aws/whats-new/2025/09/amazon-ecs-managed-instances/", title="Announcing Amazon ECS Managed Instances - AWS") }}

これにより、ECS のコンテナ実行には、「ECS on EC2」「ECS on Fargate」「ECS Managed Instances」の3種類になりました。

|項目|ECS on EC2|ECS on Fargate|ECS Managed Instances|
|--|--|--|--|
|インフラ管理|ユーザーが EC2 を用意・管理|インスタンスの概念なし|AWS が管理|
|インスタンスタイプ|ユーザーが選択|選択不可|AWS が自動最適化|
|コスト効率化|稼働しないリソースが発生しやすい|コンテナ単位で従量課金|自動集約と稼働していないリソースの削除|
|セキュリティ|ユーザーが OS パッチ適用|AWS が管理|Bottlerocket + 自動パッチ|
|柔軟性|EC2 の全機能を利用可能|ブラックボックス|EC2 の機能をほぼ利用可能|
|課金体系|EC2 料金のみ|コンテナ利用時間分の課金|EC2 料金 + 管理費用|

TODO: 後でまとめる
