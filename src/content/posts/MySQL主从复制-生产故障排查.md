---
title: 一次 MySQL 主从延迟 14 小时的故障排查
date: 2024-11-09 00:00:00
category:
    - 运维
    - Linux
    - MySQL
tags:
    - MySQL
    - 主从复制
    - 故障排查
    - IDC
    - 运维
---

那会儿我还在党校驻场，管着几千台 Linux 服务器

数据库是 MySQL 5.7 (不涉秘, 因为我后来换数据库了)，一主两从。主库扛线上业务的订单表，从库供 BI 抽数据出日报。主从复制配的是 GTID 模式，跑了快两年没出过事。

直到有一天凌晨两点二十三分。

---

Zabbix 给我打了个电话。

我设了一条触发器：Slave 的 `Seconds_Behind_Master` 超过 300 秒就告警。当时我从值班室行军床上弹起来，打开 VPN 连进去一看——

```sql
SHOW SLAVE STATUS\G
```

```
Slave_IO_Running: Yes
Slave_SQL_Running: Yes
Seconds_Behind_Master: 8614
```

八千六百秒，还在一秒一秒往上跳。

IO 线程和 SQL 线程都在跑，说明不是复制断了，是跑得慢。脑子里的第一反应不是慌，是：谁特么在从库上跑东西了？

---

先看磁盘。

```bash
iostat -x 1
```

`%util` 直挺挺地顶在 100。从库的磁盘被人吃满了。

```bash
iotop -o
```

一个 `mysqldump` 进程占了 90% 的写 IO。再看下指令：

```bash
ps aux | grep mysqldump
```

```
root 20934 mysqldump --all-databases --single-transaction
```

全库备份。凌晨两点触发。

翻 cron 一看，有个同事上周五加进去的。他当时说「就临时备份一次」，我信了。然后这个脚本在 `/etc/cron.d/` 里安安稳稳活了快十天，每天凌晨两点准时把从库 IO 跑满。

```bash
kill -9 20934
```

`%util` 从 100 掉到了 40。`Seconds_Behind_Master` 开始往下走了——慢，但方向是对的。

---

以为搞定了，准备回去接着睡。

睡前又看了一眼。下降速度不对。一秒只追 2~3 秒的延迟。按这个速度追到天亮都追不完，不用等天亮，早上八点的日报就全废了。

```bash
ls -lh /var/lib/mysql/ | grep relay
```

好家伙。relay log 堆了两百多个文件，40G。主库那边多线程并发写，从库一个 SQL 线程串行回放。就像一个人对着录像逐帧手动还原，永远追不上直播。

得想办法让回放跑快点。

---

第一个想到的是 binlog。当前从库开了 `log-slave-updates=1`，回放 relay log 的时候还会额外写一份 binlog。等于每个事务写两遍磁盘。

```sql
SET GLOBAL log_slave_updates = 0;
```

IO 当场砍了将近一半。追的速度从每秒 2 秒变成了每秒 7~8 秒。还是不够。

第二个，InnoDB 刷盘策略。默认配置是从库当主库一样小心，每个事务 commit 都刷盘。追延迟的时候不需要这么谨慎。

```sql
SET GLOBAL innodb_flush_log_at_trx_commit = 2;
SET GLOBAL sync_binlog = 0;
```

这在主库上不能这么搞，数据安全性是底线。但在正在追延迟的从库上，拿安全换时间。追完改回去就行。

第三个，并行复制。MySQL 5.7 的 LOGICAL_CLOCK 模式允许 SQL 线程拆成多个 worker 并行回放。

```sql
SET GLOBAL slave_parallel_type = LOGICAL_CLOCK;
SET GLOBAL slave_parallel_workers = 8;
STOP SLAVE SQL_THREAD;
START SLAVE SQL_THREAD;
```

八个 worker 一开，追的速度直接飙到了每秒 18~20 秒。这才是追延迟该有的样子。

---

凌晨四点零七分。

```sql
SHOW SLAVE STATUS\G
```

```
Seconds_Behind_Master: 0
```

归零了。

把参数慢慢改回去：

```sql
SET GLOBAL innodb_flush_log_at_trx_commit = 1;
SET GLOBAL sync_binlog = 1;
SET GLOBAL slave_parallel_workers = 0;
```

然后把同事的备份脚本从 cron 拿掉。顺便给他 `/etc/cron.d/` 底下留了段东西：

```bash
# 兄啊，全库备份放凌晨两点从库上跑？
# 从库 IO 被你干满，主从延迟堆到 8614 秒。
# 下次用 xtrabackup + ionice -c2 -n7，或者白天跑。
# /tmp/ 才是临时脚本该待的地方。
```

他第二天早上看见以后，请我吃了顿烧烤。说他忘了删。我说我信。

---

后来我复盘这件事，其实问题不复杂：

`mysqldump --all-databases` 在生产从库上跑就是在找死。加 `--single-transaction` 只是不加表锁，IO 该吃满还是吃满。党校的 BI 系统每天早上八点前要出报表，两小时的延迟就能让报表全废，更别说堆到 8000 多秒。

但真正的坑不是 `mysqldump`——是谁都可能在 cron 里放一个「临时」脚本然后忘了删。写临时脚本本身不是问题，不设过期时间才是。

`/tmp/` 重启就没了，`/etc/cron.d/` 不删活到天荒地老。

还有件事我之前在 Obsidian 笔记里记了 MySQL 主从复制的所有配置：AB 复制、半同步、GTID、多源复制。唯独没有记「出事了怎么处理」。笔记里全是怎么配，没记配完之后出问题了该怎么办。

因为真正要命的问题从来不是「怎么配」，是「出事了怎么办」。
