---
title: Linux 运维进阶实战——从命令到排错
date: 2026-06-05 00:00:00
category:
  - Linux
  - 运维
tags:
  - Linux
  - 运维
  - Shell
  - 教程
  - 进阶
---

> 会敲命令不等于会排错。这篇文章不讲 `ls` 和 `cd`，只讲生产环境里真正用得上的东西。

## Shell 进阶

### 管道不只是竖线

```bash
# 最基本的管道——把前一个命令的 stdout 喂给后一个命令的 stdin
ps aux | grep nginx

# 管道只传 stdout，stderr 默认不传。想让 stderr 也走管道：
ls /nonexistent 2>&1 | tee error.log

# 把 stdout 和 stderr 互换——这个在脚本里很有用
some_command 3>&1 1>&2 2>&3
```

### 进程替换

`diff` 只能比较文件，但你可以用进程替换让它比较两条命令的输出：

```bash
diff <(ls /etc) <(ls /opt)
```

`<()` 语法创建一个命名管道，把命令输出伪装成文件。这在你想比较两个目录的内容、或者 `paste` 两列命令输出时非常实用。

### 子 shell 与花括号

```bash
# 用小括号进子 shell——里面的 cd 不影响外层
(cd /tmp && ls)

# 用花括号在当前 shell 执行——cd 会生效
{ cd /tmp && ls; }
```

区别很小但关键：子 shell 里的变量、工作目录都不会影响父进程。花括号在当前 shell 跑，变量和目录都保留。脚本里常用花括号做分组重定向：

```bash
{
  echo "=== Header ==="
  cat /etc/hostname
  echo "=== Footer ==="
} > output.txt
```

### trap 信号捕获

脚本异常退出时做清理，比 `rm -rf /tmp/xxx` 丢在末尾强一万倍：

```bash
#!/bin/bash
cleanup() {
  rm -rf "$TMPDIR"
  echo "清理完成"
}
trap cleanup EXIT INT TERM

TMPDIR=$(mktemp -d)
# ... 干正事 ...
```

`trap` 捕获 EXIT（正常退出）、INT（Ctrl+C）、TERM（kill），不管脚本怎么死都能清理临时文件。

---

## 文本处理三剑客

### grep

```bash
# 基本搜索
grep -r "ERROR" /var/log/

# 反向匹配（找没有 XXX 的行）
grep -v "DEBUG" app.log

# 显示行号 + 前后各 3 行上下文
grep -n -C 3 "panic" kernel.log

# 只显示匹配到的文件名
grep -rl "TODO" src/

# 正则：匹配 IP 地址
grep -oP '\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}' access.log | sort | uniq -c | sort -rn

# 统计 404 最多的前 10 个 URL
grep ' 404 ' access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -10
```

### sed

sed 的精髓在于 "找 → 改"，不需要打开编辑器：

```bash
# 替换第一个匹配
sed 's/foo/bar/' file.txt

# 全局替换
sed 's/foo/bar/g' file.txt

# 删除第 3 行
sed '3d' file.txt

# 删除匹配行
sed '/debug/d' file.txt

# 在第 2 行后面插入
sed '2a\新插入的行' file.txt

# 原地修改（-i 直接写回文件，慎用）
sed -i 's/old/new/g' config.conf

# 只打印第 10 到 20 行
sed -n '10,20p' file.txt

# 批量修改——给所有 .conf 文件加注释
sed -i 's/^/# /' *.conf
```

### awk

awk 比 grep 和 sed 强大得多——它是完整的文本处理语言：

```bash
# 打印第 1 列和第 3 列
awk '{print $1, $3}' data.txt

# 按冒号分割，打印用户名和 UID
awk -F: '{print $1, $3}' /etc/passwd

# 条件过滤：UID >= 1000 的用户
awk -F: '$3 >= 1000 {print $1, $3}' /etc/passwd

# 求和——统计所有进程的 RSS 内存总和
ps aux | awk '{sum+=$6} END {print sum " KB"}'

# 按状态统计连接数
ss -tan | awk 'NR>1 {state[$1]++} END {for (s in state) print s, state[s]}'

# log 分析：统计每分钟的请求数
awk '{print substr($4,2,17)}' access.log | sort | uniq -c | sort -rn | head -20
```

awk 真正强的地方是处理结构化文本——它自己就是一个小型编程语言，有变量、条件、循环、数组。

---

## 用户与权限

### 基本操作

```bash
# 创建用户（含家目录）
useradd -m woxin

# 设密码
echo 'mypassword' | passwd --stdin woxin

# 删用户（连家目录一起）
userdel -r woxin

# 改用户主组
usermod -g docker woxin

# 加用户到附加组（-a 追加，不加会覆盖）
usermod -aG wheel,docker woxin

# 锁用户
usermod -L woxin
```

### sudo 精细控制

```bash
# 编辑 sudoers（必须用 visudo，它会检查语法）
visudo
```

```bash
# 允许 woxin 无需密码执行 systemctl restart nginx
woxin ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx

# 允许运维组执行所有命令但需要密码
%ops ALL=(ALL) ALL

# 允许 web 组以 www-data 身份执行命令
%web ALL=(www-data) NOPASSWD: ALL
```

### 特殊权限

```bash
# SUID：以文件所有者的身份执行（passwd 就是靠这个让普通用户改密码）
chmod u+s /usr/bin/mybin

# SGID：目录设 SGID 后，目录下新文件自动继承目录的组
chmod g+s /shared/project

# Sticky Bit：只有文件所有者和 root 能删除（/tmp 用的就是这个）
chmod +t /shared/upload
```

### ACL 细粒度权限

传统 `rwx` 只能对 owner/group/others 三层。ACL 能精确到特定用户：

```bash
# 给用户 bob 单独授权
setfacl -m u:bob:rwx /data/project

# 给组 dev 授权
setfacl -m g:dev:rx /data/project

# 查看 ACL
getfacl /data/project

# 删除某条 ACL
setfacl -x u:bob /data/project

# 递归设置
setfacl -Rm u:bob:rwx /data/project/
```

---

## 磁盘管理

### 分区

```bash
# 查看所有磁盘
lsblk
fdisk -l

# 用 parted 分区（支持 GPT，比 fdisk 好用）
parted /dev/sdb mklabel gpt
parted /dev/sdb mkpart primary ext4 0% 100%

# 格式化
mkfs.ext4 /dev/sdb1
mkfs.xfs /dev/sdb1
```

### LVM

单盘不够用、想扩容缩容——LVM 是标配：

```bash
# 创建 PV
pvcreate /dev/sdb1 /dev/sdc1

# 创建 VG
vgcreate vg_data /dev/sdb1 /dev/sdc1

# 创建 LV（100G）
lvcreate -L 100G -n lv_mysql vg_data

# 格式化并挂载
mkfs.ext4 /dev/vg_data/lv_mysql
mount /dev/vg_data/lv_mysql /var/lib/mysql
```

扩容：

```bash
# LV 扩容
lvextend -L +50G /dev/vg_data/lv_mysql

# 文件系统扩容（ext4）
resize2fs /dev/vg_data/lv_mysql

# 文件系统扩容（xfs）
xfs_growfs /var/lib/mysql
```

加新盘进 VG：

```bash
pvcreate /dev/sdd1
vgextend vg_data /dev/sdd1
```

### 磁盘检查

```bash
# 查看磁盘使用
df -h

# 查看目录占用（找出谁吃了磁盘）
du -sh /* 2>/dev/null | sort -rh | head -10

# 查看 inode 使用（inode 满了也会报 "No space left"）
df -i

# 找出大文件
find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null
```

### 已删除文件仍占空间

经典问题：`df -h` 显示磁盘满了，但 `du -sh` 找不到谁占的。原因是进程还持有已删除文件的句柄：

```bash
# 找到哪些进程在 hold 着已删除的文件
lsof | grep deleted

# 找到后重启对应的进程或清空文件描述符
echo "" > /proc/12345/fd/3
```

---

## 网络排错三步走

### 第一步：确认链路层

```bash
# 网卡状态
ip link show

# 网卡是否 UP
ip link set eth0 up

# 驱动是否加载
ethtool eth0 2>/dev/null
dmesg | grep eth0
```

### 第二步：确认 IP 层

```bash
# IP 地址
ip addr show

# 路由表
ip route show

# 默认网关
ip route | grep default

# ARP 表（二层地址解析）
ip neigh show

# 测试连通性
ping -c 4 8.8.8.8

# 跟踪路由
traceroute 8.8.8.8
mtr 8.8.8.8        # 比 traceroute 好用，动态刷新
```

### 第三步：确认传输层

```bash
# 查看监听端口
ss -tlnp

# 查看所有连接
ss -tanp

# 按状态统计
ss -tan | awk 'NR>1 {state[$1]++} END {for(s in state) print s, state[s]}'

# 测试端口连通
nc -zv 192.168.1.1 22
telnet 192.168.1.1 3306
```

### 抓包

```bash
# 抓 eth0 上 80 端口的流量
tcpdump -i eth0 port 80 -nn -v

# 抓包写文件（给 Wireshark 分析）
tcpdump -i eth0 -w capture.pcap

# 只看 SYN 包
tcpdump 'tcp[tcpflags] & (tcp-syn) != 0'

# DNS 查询
tcpdump -i eth0 port 53 -nn
```

---

## 进程与性能

### 进程管理

```bash
# 查看进程树
ps auxf

# 按 CPU 排序
ps aux --sort=-%cpu | head -10

# 按内存排序
ps aux --sort=-%mem | head -10

# 实时进程监控
top
htop

# 杀进程
kill -15 1234   # 优雅终止（SIGTERM）
kill -9 1234    # 强制杀（SIGKILL，不建议首选）
killall nginx   # 按名字杀

# 后台运行 & 前后台切换
command &
jobs            # 查看后台任务
fg %1           # 把任务 1 切到前台
bg %1           # 让暂停的任务 1 在后台继续
Ctrl+Z          # 暂停前台任务
```

### 性能诊断

```bash
# CPU——谁在吃 CPU
top -b -n1 | head -20
mpstat 1 5

# 内存
free -h
cat /proc/meminfo

# IO——谁在刷磁盘
iostat -x 1
iotop -o

# 网络 IO
iftop
nethogs          # 按进程看流量

# 系统调用——看进程在干什么
strace -p 1234 -f -e trace=network
strace -c -p 1234   # 统计系统调用耗时

# 打开的文件
lsof -p 1234
lsof /var/log       # 谁在用这个目录

# 负载
uptime
cat /proc/loadavg
```

### 系统服务

```bash
# systemd 管理的服务
systemctl status nginx
systemctl start/stop/restart nginx
systemctl enable/disable nginx

# 查看日志
journalctl -u nginx -f
journalctl -u nginx --since "10 minutes ago"

# 查看启动耗时
systemd-analyze blame
```

---

## iptables 防火墙速查

```bash
# 查看规则（带行号）
iptables -L -n -v --line-numbers

# 放行端口
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 禁止某个 IP
iptables -A INPUT -s 192.168.1.100 -j DROP

# 删除第 3 条规则
iptables -D INPUT 3

# 保存规则
iptables-save > /etc/iptables/rules.v4

# 恢复规则
iptables-restore < /etc/iptables/rules.v4
```

规则匹配顺序是从上到下，命中即停。常见的错误是把 `DROP` 放在 `ACCEPT` 前面，然后全断了。

---

## shell 脚本实用片段

### 带颜色的日志

```bash
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
NC='\033[0m'  # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
```

### 安全创建用户

```bash
#!/bin/bash
read -p "输入用户名: " username
if id "$username" &>/dev/null; then
  echo "用户 $username 已存在"
else
  useradd -m "$username"
  read -sp "输入密码: " password
  echo "$password" | passwd --stdin "$username"
  echo "用户 $username 创建完成"
fi
```

### 检查文件是否存在

```bash
#!/bin/bash
read -p "输入文件路径: " filepath
if [ -f "$filepath" ]; then
  echo "文件存在: $(stat -c '%s bytes, modified %y' "$filepath")"
else
  echo "文件不存在，创建中..."
  touch "$filepath"
fi
```

### 磁盘告警

```bash
#!/bin/bash
THRESHOLD=80
df -h | awk 'NR>1 {gsub(/%/,"",$5); if($5+0 > '"$THRESHOLD"') print $1, $5"%"}'
```

---

这些内容大部分来自平时实际工作里的积累。命令谁都会查手册，但有经验的运维知道什么时候该用哪个——这不是看书能学会的，是出过事才知道的。
