---
title: Rust 服务器搭建教程
category:
  - 教程
  - 游戏
tags:
  - Rust
  - 开服
  - 游戏
  - 教程
date: 2024-04-03 13:25:00
---

<style>
  .distro-tabs { display: flex; gap: 0; background: var(--bg-base); border: var(--border-subtle); border-radius: 8px 8px 0 0; overflow: hidden; margin-top: 1rem; }
  .distro-tabs .distro-btn { flex: 1; padding: 0.45rem 0.5rem; border: none; background: transparent; color: var(--text-tertiary); font-size: 0.78rem; cursor: pointer; border-bottom: 2px solid transparent; }
  .distro-tabs .distro-btn:hover { color: var(--text-secondary); }
  .distro-tabs .distro-btn.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
  .distro-content { border: var(--border-subtle); border-top: none; border-radius: 0 0 8px 8px; }
  .distro-content .distro-code { display: none; }
  .distro-content .distro-code:first-of-type { display: block; }
  .distro-content .distro-code pre { margin: 0; border-radius: 0; }
</style>

> Rust 服务端对配置要求不低——8GB 内存起步，推荐 16GB。地图越大、玩家越多，吃得越多。通过 SteamCMD 下载，App ID `258550`。

Rust 和前面几个游戏不太一样：它的世界地图是**每次清档时随机生成的**，不是固定的。这意味着你需要设置地图种子（seed）和大小（worldsize）。不同大小的地图占用的内存差别很大：

| 地图大小 | 内存最低 | 推荐内存 |
|---|---|---|
| 2000 | 4 GB | 6 GB |
| 3000 | 6 GB | 8 GB |
| 4000 | 8 GB | 12 GB |
| 6000 | 12 GB | 16 GB |

<div id="rust">
<div class="distro-tabs">
  <button class="distro-btn active" data-distro="ubuntu" onclick="switchDistro('rust','ubuntu')">Ubuntu</button>
  <button class="distro-btn" data-distro="c7" onclick="switchDistro('rust','c7')">CentOS 7</button>
  <button class="distro-btn" data-distro="c9" onclick="switchDistro('rust','c9')">CentOS 9</button>
  <button class="distro-btn" data-distro="arch" onclick="switchDistro('rust','arch')">Arch</button>
  <button class="distro-btn" data-distro="nix" onclick="switchDistro('rust','nix')">NixOS</button>
</div>
<div class="distro-content">

<div class="distro-code" id="rust-ubuntu">

```bash
sudo dpkg --add-architecture i386
sudo apt update && sudo apt install -y steamcmd lib32gcc-s1 screen

mkdir -p ~/rust && cd ~/rust
steamcmd +force_install_dir ./server +login anonymous +app_update 258550 validate +quit

cd server
./RustDedicated -batchmode \
  +server.port 28015 \
  +server.level "Procedural Map" \
  +server.seed 1234 \
  +server.worldsize 4000 \
  +server.maxplayers 50 \
  +server.hostname "My Rust Server" \
  +server.description "Welcome to my server" \
  +rcon.port 28016 \
  +rcon.password "changeme"
```

</div>
<div class="distro-code" id="rust-c7">

```bash
sudo yum install -y glibc.i686 libstdc++.i686 steamcmd screen
mkdir ~/rust && cd ~/rust
steamcmd +force_install_dir ./server +login anonymous +app_update 258550 validate +quit
cd server
./RustDedicated -batchmode +server.port 28015 +server.level "Procedural Map" +server.seed 1234 +server.worldsize 4000 +server.maxplayers 50
```

</div>
<div class="distro-code" id="rust-c9">

```bash
sudo dnf install -y glibc.i686 libstdc++.i686 steamcmd screen
mkdir ~/rust && cd ~/rust
steamcmd +force_install_dir ./server +login anonymous +app_update 258550 validate +quit
cd server
./RustDedicated -batchmode +server.port 28015 +server.level "Procedural Map" +server.seed 1234 +server.worldsize 4000 +server.maxplayers 50
```

</div>
<div class="distro-code" id="rust-arch">

```bash
sudo pacman -Syu steamcmd lib32-gcc-libs screen
mkdir ~/rust && cd ~/rust
steamcmd +force_install_dir ./server +login anonymous +app_update 258550 validate +quit
cd server
./RustDedicated -batchmode +server.port 28015 +server.level "Procedural Map" +server.seed 1234 +server.worldsize 4000 +server.maxplayers 50
```

</div>
<div class="distro-code" id="rust-nix">

```nix
environment.systemPackages = with pkgs; [ steamcmd ];
```

```bash
mkdir ~/rust && cd ~/rust
steamcmd +force_install_dir ./server +login anonymous +app_update 258550 validate +quit
cd server
./RustDedicated -batchmode +server.port 28015 +server.level "Procedural Map" +server.seed 1234 +server.worldsize 4000 +server.maxplayers 50
```

</div>
</div>
</div>

## RCON 远程管理

RCON 可以让你在不登录 SSH 的情况下管理服务器——踢人、封人、发公告、查状态。启动参数里 `+rcon.port` 和 `+rcon.password` 设了之后，可以用 RCON 客户端（推荐 [rcon.io](https://rcon.io) 或手机上的 Rust Admin 应用）连接。

```bash
# 连接后可以输入这些命令：
status              # 查看在线玩家
kick "玩家名"        # 踢出玩家
ban "玩家名"         # 封禁玩家
say "公告内容"       # 全服广播
```

> RCON 密码不要和服务器登录密码一样！RCON 是明文传输的，安全性不如 SSH。

## 清档（Wipe）

Rust 社区有定期清档的传统——大多数服每个月或每周清一次（强制 Wipe）。清档的意思是把所有人的建筑、物品全删掉，世界重新生成。修改种子号 `+server.seed 1234` 里的数字就行：换个新数字 = 生成新地图。

## 端口

Rust 需要两个端口：

```bash
# 游戏端口 28015 + RCON 端口 28016
sudo ufw allow 28015:28016/udp
sudo ufw allow 28015:28016/tcp
```
