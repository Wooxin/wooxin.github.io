---
title: Palworld 服务器搭建教程
category:
  - 教程
  - 游戏
tags:
  - Palworld
  - 开服
  - 游戏
  - 教程
date: 2024-04-03 13:20:00
---

<style>
  .distro-tabs { display: flex; gap: 0; background: var(--bg-base); border: var(--border-subtle); border-radius: 8px 8px 0 0; overflow: hidden; margin-top: 1rem; }
  .distro-tabs .distro-btn { flex: 1; padding: 0.45rem 0.5rem; border: none; background: transparent; color: var(--text-tertiary); font-size: 0.78rem; cursor: pointer; border-bottom: 2px solid transparent; transition: 0.15s; }
  .distro-tabs .distro-btn:hover { color: var(--text-secondary); }
  .distro-tabs .distro-btn.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
  .distro-content { border: var(--border-subtle); border-top: none; border-radius: 0 0 8px 8px; }
  .distro-content .distro-code { display: none; }
  .distro-content .distro-code:first-of-type { display: block; }
  .distro-content .distro-code pre { margin: 0; border-radius: 0; }
</style>

> Palworld（幻兽帕鲁）吃内存比较狠——不开玩笑，8GB 是基础要求，16GB 才能稳。而且有内存泄漏，必须配定时重启。

## 硬件要求

Palworld 服务端对配置的要求比一般游戏高不少：

| 玩家人数 | 内存 | CPU |
|---|---|---|
| 2-4 人 | 8 GB | 2 核 |
| 5-10 人 | 16 GB | 4 核 |
| 10-20 人 | 32 GB | 6+ 核 |

内存是最大的瓶颈。帕鲁的服务器有内存泄漏问题——跑的时间越长，占的内存越大。官方还没完全修好，所以**每天定时重启是刚需**（后面会讲）。

## 部署步骤

Palworld 通过 SteamCMD 下载，App ID 是 `2394010`。点击标签选系统：

<div id="palworld">
<div class="distro-tabs">
  <button class="distro-btn active" data-distro="ubuntu" onclick="switchDistro('palworld','ubuntu')">Ubuntu</button>
  <button class="distro-btn" data-distro="c7" onclick="switchDistro('palworld','c7')">CentOS 7</button>
  <button class="distro-btn" data-distro="c9" onclick="switchDistro('palworld','c9')">CentOS 9</button>
  <button class="distro-btn" data-distro="arch" onclick="switchDistro('palworld','arch')">Arch</button>
  <button class="distro-btn" data-distro="nix" onclick="switchDistro('palworld','nix')">NixOS</button>
</div>
<div class="distro-content">

<div class="distro-code" id="palworld-ubuntu">

```bash
# 先让系统支持 32 位程序，然后装 SteamCMD
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install -y steamcmd lib32gcc-s1 screen

# 创建文件夹，下载服务端
mkdir -p ~/palworld && cd ~/palworld
steamcmd +force_install_dir ./server +login anonymous +app_update 2394010 validate +quit

# 启动！
cd server
./PalServer.sh -port=8211 -players=32 -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS
```

</div>
<div class="distro-code" id="palworld-c7">

```bash
sudo yum install -y glibc.i686 libstdc++.i686 steamcmd screen
mkdir ~/palworld && cd ~/palworld
steamcmd +force_install_dir ./server +login anonymous +app_update 2394010 validate +quit
cd server && ./PalServer.sh -port=8211 -players=32
```

</div>
<div class="distro-code" id="palworld-c9">

```bash
sudo dnf install -y glibc.i686 libstdc++.i686 steamcmd screen
mkdir ~/palworld && cd ~/palworld
steamcmd +force_install_dir ./server +login anonymous +app_update 2394010 validate +quit
cd server && ./PalServer.sh -port=8211 -players=32
```

</div>
<div class="distro-code" id="palworld-arch">

```bash
sudo sed -i '/\[multilib\]/,/Include/ s/^#//' /etc/pacman.conf
sudo pacman -Syu steamcmd lib32-gcc-libs screen
mkdir ~/palworld && cd ~/palworld
steamcmd +force_install_dir ./server +login anonymous +app_update 2394010 validate +quit
cd server && ./PalServer.sh -port=8211 -players=32
```

</div>
<div class="distro-code" id="palworld-nix">

```nix
environment.systemPackages = with pkgs; [ steamcmd ];
```

```bash
mkdir ~/palworld && cd ~/palworld
steamcmd +force_install_dir ./server +login anonymous +app_update 2394010 validate +quit
cd server && ./PalServer.sh -port=8211 -players=32
```

</div>
</div>
</div>

## 启动参数说明

```bash
./PalServer.sh \
  -port=8211 \                # 游戏端口
  -players=32 \               # 最大玩家数
  -useperfthreads \           # 使用性能线程
  -NoAsyncLoadingThread \     # 关闭异步加载（减少崩溃）
  -UseMultithreadForDS        # 多线程处理
```

`-NoAsyncLoadingThread` 这个参数很重要——关了之后启动会慢一点，但运行期间稳定性好得多。社区实测有效。

## 配置

服务器第一次启动会在 `Pal/Saved/Config/LinuxServer/` 下生成 `PalWorldSettings.ini`。如果没有就自己创建一个：

```ini
[/Script/Pal.PalGameWorldSettings]
OptionSettings=(ServerName="我的帕鲁世界",ServerDescription="欢迎",AdminPassword="admin123",ServerPassword="",PublicPort=8211,ServerPlayerMaxNum=32,PalSpawnNumRate=1.0,DayTimeSpeedRate=1.0,NightTimeSpeedRate=1.0,ExpRate=1.0,PalCaptureRate=1.0,PalEggDefaultHatchingTime=72.0)
```

关键参数：
- `ServerPassword` — 设了密码就只有知道密码的人能进
- `PalSpawnNumRate` — 帕鲁刷新倍率（1.0 是默认）
- `ExpRate` — 经验倍率
- `PalCaptureRate` — 捕捉倍率

## 定时重启

Palworld 有内存泄漏是公认的问题，跑久了内存会一直涨。配个每天凌晨重启：

```bash
# systemd 服务
sudo cat > /etc/systemd/system/palworld.service << 'EOF'
[Unit]
Description=Palworld Server
After=network.target

[Service]
User=root
WorkingDirectory=/root/palworld/server
ExecStart=/root/palworld/server/PalServer.sh -port=8211 -players=32 -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now palworld

# crontab 每天早上 6 点自动重启
sudo crontab -e
# 加上这一行：
0 6 * * * systemctl restart palworld
```

重启前最好在游戏内广播提醒玩家（如果你在线的话）。如果不在线，玩家会断线然后重新连回来，一般不影响存档。

## 端口

默认 `8211` UDP：

```bash
sudo ufw allow 8211/udp
sudo firewall-cmd --add-port=8211/udp --permanent && sudo firewall-cmd --reload
```

## 备份存档

存档路径在服务端的 `Pal/Saved/SaveGames/` 下：

```bash
tar -czf "palworld-backup-$(date +%Y%m%d).tar.gz" Pal/Saved/SaveGames/
```

每天备份一次，出 bug 了直接回滚存档。
