+++
title = "iPerf でネットワークパフォーマンスを測定してみた"
date = 2025-11-27
updated = 2025-11-27
draft = true
taxonomies = { tags=["iPerf", "Network", "Performance", "Tools"], categories=["Tools"] }
math = true
[extra]
author = "etak64n"
hero = "/images/hero/placeholder.svg"
toc = true
+++

## iPerf でネットワークパフォーマンスを測定してみた

iPerf はネットワークのスループットを測定するオープンソースのツールとなります。

{{ link(url="https://github.com/esnet/iperf", title="GitHub - esnet/iperf: iperf3: A TCP, UDP, and SCTP network bandwidth measurement tool") }}

現在は iPerf3 が最新版となります。

## 使い方

iPerf を使う前提として、2拠点間のネットワークスループットを測定することになります。
通信元のクライアント、通信先のサーバーそれぞれに iPerf を導入して、iPerf 同士で通信を行なってスループットを測定します。

図: iPerf Client - iPerf Server

使用するポートは tcp/5201、udp/5201 です。

### インストール手順

```
# インストール
sudo yum install iperf3  # RHEL/Amazon Linux
sudo apt install iperf3  # Ubuntu/Debian
```

```
$ which iperf3
```

注意点として、クライアントとサーバー両方に iperf3 が入っている必要があります。

### 測定

1. サーバー側で `iperf3 -s` を実施します
2. クライアント側で `iperf3 -c <ServerIP>` を実施します

**サーバー側(立ち上げ時)**

```sh
[ec2-user@ip-10-0-0-116 ~]$ iperf3 -s
-----------------------------------------------------------
Server listening on 5201 (test #1)
-----------------------------------------------------------
```

**クライアント側(送信時)**

```sh
[ec2-user@ip-10-0-0-143 ~]$ iperf3 -c 10.0.0.116
Connecting to host 10.0.0.116, port 5201
[  5] local 10.0.0.143 port 36642 connected to 10.0.0.116 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec   550 MBytes  4.61 Gbits/sec   13   1.83 MBytes       
[  5]   1.00-2.00   sec   535 MBytes  4.49 Gbits/sec    0   2.12 MBytes       
[  5]   2.00-3.00   sec   589 MBytes  4.94 Gbits/sec    0   2.28 MBytes       
[  5]   3.00-4.00   sec   580 MBytes  4.87 Gbits/sec    0   2.38 MBytes       
[  5]   4.00-5.00   sec   579 MBytes  4.85 Gbits/sec    0   2.42 MBytes       
[  5]   5.00-6.00   sec   572 MBytes  4.80 Gbits/sec    0   2.42 MBytes       
[  5]   6.00-7.00   sec   581 MBytes  4.87 Gbits/sec    0   2.42 MBytes       
[  5]   7.00-8.00   sec   572 MBytes  4.81 Gbits/sec    3   1.71 MBytes       
[  5]   8.00-9.00   sec   564 MBytes  4.73 Gbits/sec    0   2.00 MBytes       
[  5]   9.00-10.00  sec   573 MBytes  4.80 Gbits/sec    0   2.22 MBytes       
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-10.00  sec  5.57 GBytes  4.78 Gbits/sec   16            sender
[  5]   0.00-10.01  sec  5.57 GBytes  4.78 Gbits/sec                  receiver
```

**サーバー側(受信時)**

```sh
[ec2-user@ip-10-0-0-116 ~]$ iperf3 -s
-----------------------------------------------------------
Server listening on 5201 (test #1)
-----------------------------------------------------------
Accepted connection from 10.0.0.143, port 36632
[  5] local 10.0.0.116 port 5201 connected to 10.0.0.143 port 36642
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-1.00   sec   547 MBytes  4.58 Gbits/sec
[  5]   1.00-2.00   sec   536 MBytes  4.49 Gbits/sec
[  5]   2.00-3.00   sec   588 MBytes  4.93 Gbits/sec
[  5]   3.00-4.00   sec   580 MBytes  4.86 Gbits/sec
[  5]   4.00-5.00   sec   580 MBytes  4.86 Gbits/sec
[  5]   5.00-6.00   sec   571 MBytes  4.79 Gbits/sec
[  5]   6.00-7.00   sec   581 MBytes  4.87 Gbits/sec
[  5]   7.00-8.00   sec   576 MBytes  4.83 Gbits/sec
[  5]   8.00-9.00   sec   566 MBytes  4.75 Gbits/sec
[  5]   9.00-10.00  sec   573 MBytes  4.81 Gbits/sec
[  5]  10.00-10.01  sec  2.88 MBytes  4.96 Gbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-10.01  sec  5.57 GBytes  4.78 Gbits/sec                  receiver
-----------------------------------------------------------
Server listening on 5201 (test #2)
-----------------------------------------------------------
```

4.78 Gbits/sec の Bitrate が出ているため、今回の2拠点間の通信では、4.78 Gbps の速度が出ることが確認できます。

## まとめ
iPerf の使い方をまとめました。
ネットワークのパフォーマンスが正しく出るか確認するツールで、個人的にはあまり使用頻度は高くありません。
ポート番号や使い方を忘れてしまうので、記事として残しておきます。