---
title: Minecraft Java 版服务器搭建教程
category:
  - 教程
  - 游戏
tags:
  - Minecraft
  - 开服
  - 游戏
  - 教程
date: 2024-04-03 13:00:00
---


<style>
  .distro-tabs { display: flex; gap: 0; background: var(--bg-base); border: var(--border-subtle); border-radius: 8px 8px 0 0; overflow: hidden; margin-top: 1rem; }
  .distro-tabs .distro-btn { flex: 1; padding: 0.45rem 0.5rem; border: none; background: transparent; color: var(--text-tertiary); font-size: 0.78rem; cursor: pointer; border-bottom: 2px solid transparent; transition: 0.15s; }
  .distro-tabs .distro-btn:hover { color: var(--text-secondary); }
  .distro-tabs .distro-btn.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
  .distro-content { border: var(--border-subtle); border-top: none; border-radius: 0 0 8px 8px; padding: 0; }
  .distro-content .distro-code { display: none; }
  .distro-content .distro-code:first-of-type { display: block; }
  .distro-content .distro-code pre { margin: 0; border-radius: 0; }
</style>

> 这篇教程会手把手教你从零搭建一个 Minecraft Java 版服务器。不需要任何 Linux 经验，也不需要懂编程。跟着步骤走就行。

## 什么是服务器？我需要什么？

Minecraft 服务器本质上就是一台**一直在运行的电脑**，它负责管理整个游戏世界。当你在游戏里打开「多人游戏」连上一台服务器时：

- 你的电脑只负责渲染画面（你看到的方块、光影）
- 服务器负责计算所有玩家的位置、方块变化、怪物 AI、红石电路
- 所有玩家共享同一个世界，谁改了什么东西，服务器都会同步给其他人

你需要的只有两样东西：

1. **一台安装了 Linux 系统的电脑**（或者一台云服务器——阿里云、腾讯云买的最便宜的那种就行，2 核 4G 内存跑原版完全够）
2. **这台电脑能连上互联网**（如果只在家里的局域网和朋友玩，能连路由器就行）

> 如果你没有多余的电脑，去买一台云服务器比买一台实体机划算。云服务器按月付费，不想玩了随时退，比买硬件便宜多了。

## 什么是 Linux 发行版？

你打开电脑看到 Windows 桌面，那是操作系统。Linux 也是操作系统，但 Linux 有很多种——叫「发行版」。

发行版之间的区别就像是不同品牌的汽车——都能开，但方向盘手感不一样、油耗不一样、配件不一样。下面列出五个常用发行版，你选一个就行：

- **Ubuntu**：最流行的 Linux，社区最大，新手首选。教程最多，出问题最容易搜到答案
- **CentOS 7**：老牌服务器系统，很多公司还在用。基于 Red Hat，稳定但软件偏旧
- **CentOS 9**：CentOS 7 的接班人，软件版本相对较新
- **Arch Linux**：极客最爱，软件最新，但安装时需要手动敲命令，不适合完全没经验的新手
- **NixOS**：一个理念非常先进的系统——整个系统用一份配置文件描述，任何改动都能回滚，永远不怕装软件把系统搞崩

> 如果你是第一次接触 Linux：**选 Ubuntu**。资料最多，坑最少。下面的教程你点「Ubuntu」标签就行，其他系统的命令是给已经装了对应系统的人准备的。

点击下面的标签切换你的系统：

<div id="mc">
<div class="distro-tabs">
  <button class="distro-btn active" data-distro="ubuntu" onclick="switchDistro('mc','ubuntu')">Ubuntu</button>
  <button class="distro-btn" data-distro="c7" onclick="switchDistro('mc','c7')">CentOS 7</button>
  <button class="distro-btn" data-distro="c9" onclick="switchDistro('mc','c9')">CentOS 9</button>
  <button class="distro-btn" data-distro="arch" onclick="switchDistro('mc','arch')">Arch</button>
  <button class="distro-btn" data-distro="nix" onclick="switchDistro('mc','nix')">NixOS</button>
</div>
<div class="distro-content">

<div class="distro-code" id="mc-ubuntu">

```bash
# 第一步：更新系统软件列表（就像 Windows 检查更新）
sudo apt update

# 第二步：安装 Java（Minecraft 需要 Java 来运行）
# openjdk-21-jre-headless 是 Java 运行环境，"headless" 表示不需要图形界面
sudo apt install -y openjdk-21-jre-headless wget screen

# 第三步：创建专门跑 Minecraft 的用户
# 不要用 root（管理员账户）跑游戏服务器，安全第一
# useradd 创建用户，-m 表示创建家目录，-s /bin/bash 指定用什么 shell
sudo useradd -m -s /bin/bash minecraft

# 第四步：切换到 minecraft 用户操作
sudo -u minecraft -i

# 第五步：创建服务端文件夹
mkdir server && cd server

# 第六步：下载 Minecraft 服务端
# 去 https://www.minecraft.net/download/server 找到最新的 jar 包链接替换下面的 URL
wget https://piston-data.mojang.com/v1/objects/xxx/server.jar

# 第七步：同意最终用户协议（EULA）
# Minecraft 要求先同意使用条款才能开服，echo 就是往文件里写字
echo "eula=true" > eula.txt

# 第八步：启动！
# -Xmx4G 表示最多用 4GB 内存，-Xms2G 表示初始分配 2GB
# nogui 表示不显示图形管理界面（服务器不需要）
java -Xmx4G -Xms2G -jar server.jar nogui
```

</div>
<div class="distro-code" id="mc-c7">

```bash
# CentOS 7 需要先装 epel-release 扩展源
sudo yum install -y epel-release

# 安装 Java 和必要的工具
sudo yum install -y java-21-openjdk-headless wget screen

# 创建专用用户
sudo useradd -m minecraft

# 切换到 minecraft 用户
sudo -u minecraft -i
mkdir server && cd server

# 下载服务端（去 minecraft.net 获取最新链接）
wget https://piston-data.mojang.com/v1/objects/xxx/server.jar

# 同意协议
echo "eula=true" > eula.txt

# 启动：Xmx 设最大内存，Xms 设初始内存
java -Xmx4G -Xms2G -jar server.jar nogui
```

</div>
<div class="distro-code" id="mc-c9">

```bash
# CentOS 9 / Rocky Linux / AlmaLinux
sudo dnf install -y java-21-openjdk-headless wget screen

sudo useradd -m minecraft
sudo -u minecraft -i
mkdir server && cd server

wget https://piston-data.mojang.com/v1/objects/xxx/server.jar
echo "eula=true" > eula.txt
java -Xmx4G -Xms2G -jar server.jar nogui
```

</div>
<div class="distro-code" id="mc-arch">

```bash
# Arch Linux 的包管理叫 pacman，-S 表示安装，--needed 表示跳过已安装的
sudo pacman -S --needed jre21-openjdk-headless wget screen

sudo useradd -m minecraft
sudo -u minecraft -i
mkdir server && cd server

wget https://piston-data.mojang.com/v1/objects/xxx/server.jar
echo "eula=true" > eula.txt
java -Xmx4G -Xms2G -jar server.jar nogui
```

</div>
<div class="distro-code" id="mc-nix">

```nix
# 在 /etc/nixos/configuration.nix 中加入：
environment.systemPackages = with pkgs; [ jdk21_headless wget screen ];
users.users.minecraft = { isNormalUser = true; };
# 运行 sudo nixos-rebuild switch 使配置生效
```

```bash
# 切换到 minecraft 用户，然后：
sudo -u minecraft -i
mkdir server && cd server
wget https://piston-data.mojang.com/v1/objects/xxx/server.jar
echo "eula=true" > eula.txt
java -Xmx4G -Xms2G -jar server.jar nogui
```

</div>
</div>
</div>

## 启动之后

第一次启动会看到一串日志，最后出现 `Done` 就说明启动成功了。这时候你在 Minecraft 里打开「多人游戏」→「添加服务器」→ 输入 `localhost`（如果服务器就在你当前电脑上）或服务器的 IP 地址，就能连上。

第一次启动后，`server.jar` 所在的文件夹里会生成几个重要文件：

- `server.properties` — 服务器核心设置（游戏模式、难度、最大人数等），用记事本就能改
- `ops.json` — 管理员名单（有权限踢人、封禁的玩家）
- `whitelist.json` — 白名单（开启后只有名单里的人能进服）
- `world/` — 你的世界存档，**备份先把这个文件夹打包**

## 让服务器在你关掉 SSH 后继续跑

当你通过 SSH 连上云服务器执行上面的命令时，一旦你关掉 SSH 窗口，服务器进程也会被杀死。解决方法有两种：

### 方法一：screen（简单）

`screen` 就像一个虚拟的窗口，你在这个窗口里跑的命令不受 SSH 断开影响：

```bash
screen -S mc           # 创建一个叫 mc 的窗口
java -Xmx4G -Xms2G -jar server.jar nogui
# 然后按 Ctrl+A，松开，再按 D——你就从这个窗口「分离」了
# 回到原始终端，可以安全地关 SSH

screen -r mc           # 重新连接那个窗口
```

### 方法二：systemd 服务（推荐长期使用）

把 Minecraft 服务器注册为系统服务，实现开机自启、崩溃自动重启：

```bash
sudo cat > /etc/systemd/system/minecraft.service << 'EOF'
[Unit]
Description=Minecraft Server
After=network.target

[Service]
User=minecraft
WorkingDirectory=/home/minecraft/server
ExecStart=/usr/bin/java -Xmx4G -Xms2G -jar server.jar nogui
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 设为开机自启
sudo systemctl enable minecraft

# 立即启动
sudo systemctl start minecraft

# 查看运行状态
sudo systemctl status minecraft

# 查看实时日志
sudo journalctl -u minecraft -f
```

以后每次重启服务器，Minecraft 服务会自动启动。崩溃了也会自动重启。

## 别人怎么连进来

如果你的服务器在**同一台路由器下**（比如在家里），同一局域网内的电脑直接用 `192.168.x.x:25565` 就能连。

如果**外面的人**也要连（比如朋友在不同的城市），你需要：

1. 在路由器管理页面设置**端口转发**（Port Forwarding）：把外网 `25565` 端口的流量转发到你服务器内网 IP 的 `25565` 端口
2. 如果服务器有防火墙，放行 `25565` 端口：

```bash
# Ubuntu——用 ufw
sudo ufw allow 25565/tcp

# CentOS——用 firewalld
sudo firewall-cmd --add-port=25565/tcp --permanent
sudo firewall-cmd --reload

# 云服务器——在云服务商控制台的「安全组」里添加规则，放行 25565 端口
```

> 云服务器（阿里云、腾讯云等）有两层防火墙：系统内部的 iptables/firewalld，以及云平台控制台的「安全组」。两个都得放行，外面的人才能连进来。新人经常只配了系统忘了配安全组，然后就骂「为什么连不上」。

## 常用 server.properties 设置

```properties
# 游戏模式（survival=生存，creative=创造，adventure=冒险）
gamemode=survival

# 难度（peaceful=和平，easy=简单，normal=普通，hard=困难）
difficulty=normal

# 开启正版验证（设为 false 的话盗版也能进，但不推荐）
online-mode=true

# 最大玩家数
max-players=20

# 允许飞行（默认关）
allow-flight=false

# 启用命令方块
enable-command-blocks=false

# 世界种子（设好之后不要改，否则会生成新世界）
level-seed=

# PVP（玩家之间能不能互相攻击）
pvp=true
```

改完 `server.properties` 后，在服务器控制台输入 `reload` 或直接重启服务让修改生效。

## 性能参数

如果你的服务器内存不大，这些参数很重要：

```bash
# 小服（2-5 人，原版）
java -Xmx4G -Xms2G -jar server.jar nogui

# 中型服（10-20 人，少量插件）
java -Xmx8G -Xms4G -XX:+UseG1GC -jar server.jar nogui

# 大型 Mod 服（50+ Mod）
java -Xmx16G -Xms8G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -jar server.jar nogui
```

参数解释：
- `-Xmx`：Java 能用的最大内存
- `-Xms`：启动时初始分配的内存
- `-XX:+UseG1GC`：使用 G1 垃圾回收器，比默认的更适合大内存
- 内存单位是 M（兆）和 G（吉），4G = 4096M

你的电脑总内存减去系统自己需要的（约 1-2G），剩下的才能分给 Minecraft。比如 8G 总内存的机器，给 Minecraft 分 4-5G 是安全的。给多了系统会卡死。

## 备份

没有什么比玩了几个月的存档丢了更让人崩溃的。定期备份：

```bash
# 打包备份（推荐每天自动跑一次）
tar -czf "backup-$(date +%Y%m%d).tar.gz" world/

# 加上 crontab 每天凌晨 3 点自动备份
echo "0 3 * * * tar -czf /home/minecraft/backups/backup-\$(date +\%Y\%m\%d).tar.gz /home/minecraft/server/world/" | crontab -
```
