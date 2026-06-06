---
title: ARK Survival Evolved 服务器搭建教程
category:
  - 教程
  - 游戏
tags:
  - ARK
  - 开服
  - 游戏
  - 教程
date: 2024-04-03 13:30:00
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

> ARK 服务端是本教程里最大的一个——本体 + 免费 DLC 地图下载完超过 60GB。建议用 SSD，机械硬盘加载时间会让你怀疑人生。通过 SteamCMD 下载，App ID `376030`。

## 下载量警告

ARK 服务端的下载量真的很大。如果你用的是按流量计费的云服务器，先确认一下流量配额。第一次下载约 40-60GB，取决于你下了几个 DLC 地图。

如果你只是和几个朋友玩，建议只下载基础地图（The Island）+ 你想玩的那个 DLC 地图，别全下。用 SteamCMD 的 `+app_update` 默认下载全部，可以分多次下载。

<div id="ark">
<div class="distro-tabs">
  <button class="distro-btn active" data-distro="ubuntu" onclick="switchDistro('ark','ubuntu')">Ubuntu</button>
  <button class="distro-btn" data-distro="c7" onclick="switchDistro('ark','c7')">CentOS 7</button>
  <button class="distro-btn" data-distro="c9" onclick="switchDistro('ark','c9')">CentOS 9</button>
  <button class="distro-btn" data-distro="arch" onclick="switchDistro('ark','arch')">Arch</button>
  <button class="distro-btn" data-distro="nix" onclick="switchDistro('ark','nix')">NixOS</button>
</div>
<div class="distro-content">

<div class="distro-code" id="ark-ubuntu">

```bash
sudo dpkg --add-architecture i386
sudo apt update && sudo apt install -y steamcmd lib32gcc-s1 screen

mkdir -p ~/ark && cd ~/ark
steamcmd +force_install_dir ./server +login anonymous +app_update 376030 validate +quit

cd server/ShooterGame/Binaries/Linux
./ShooterGameServer TheIsland?SessionName=MyARK?MaxPlayers=16?Port=7777?QueryPort=27015 -server -log
```

</div>
<div class="distro-code" id="ark-c7">

```bash
sudo yum install -y glibc.i686 libstdc++.i686 steamcmd screen
mkdir ~/ark && cd ~/ark
steamcmd +force_install_dir ./server +login anonymous +app_update 376030 validate +quit
cd server/ShooterGame/Binaries/Linux
./ShooterGameServer TheIsland?SessionName=MyARK?MaxPlayers=16 -server -log
```

</div>
<div class="distro-code" id="ark-c9">

```bash
sudo dnf install -y glibc.i686 libstdc++.i686 steamcmd screen
mkdir ~/ark && cd ~/ark
steamcmd +force_install_dir ./server +login anonymous +app_update 376030 validate +quit
cd server/ShooterGame/Binaries/Linux
./ShooterGameServer TheIsland?SessionName=MyARK?MaxPlayers=16 -server -log
```

</div>
<div class="distro-code" id="ark-arch">

```bash
sudo pacman -Syu steamcmd lib32-gcc-libs screen
mkdir ~/ark && cd ~/ark
steamcmd +force_install_dir ./server +login anonymous +app_update 376030 validate +quit
cd server/ShooterGame/Binaries/Linux
./ShooterGameServer TheIsland?SessionName=MyARK?MaxPlayers=16 -server -log
```

</div>
<div class="distro-code" id="ark-nix">

```nix
environment.systemPackages = with pkgs; [ steamcmd ];
```

```bash
mkdir ~/ark && cd ~/ark
steamcmd +force_install_dir ./server +login anonymous +app_update 376030 validate +quit
cd server/ShooterGame/Binaries/Linux
./ShooterGameServer TheIsland?SessionName=MyARK?MaxPlayers=16 -server -log
```

</div>
</div>
</div>

## 启动参数

ARK 的启动参数通过 URL 格式传递（问号后面跟参数）：

```
TheIsland                          # 地图名（TheIsland=孤岛, Ragnarok=仙境, Aberration=畸变）
?SessionName=MyARK                 # 服务器名称
?MaxPlayers=16                     # 最大人数
?Port=7777                         # 游戏端口
?QueryPort=27015                   # 查询端口（游戏端口 + 1）
?ServerPassword=secret             # 密码（不设就是公开的）
?ServerAdminPassword=admin123      # 管理员密码（进游戏后输入 enablecheats admin123 获得管理权）
```

## 端口

```bash
sudo ufw allow 7777:7778/udp
sudo ufw allow 27015/udp
```

## 调倍率

ARK 可以在 `ShooterGame/Saved/Config/LinuxServer/GameUserSettings.ini` 里调各种倍率：

```ini
[ServerSettings]
TamingSpeedMultiplier=3.0          # 驯服速度（3 倍）
HarvestAmountMultiplier=2.0        # 采集倍率（2 倍）
XPMultiplier=2.0                   # 经验倍率（2 倍）
MatingIntervalMultiplier=0.5       # 交配间隔（0.5 = 一半时间）
EggHatchSpeedMultiplier=5.0        # 孵蛋速度（5 倍）
```

ARK 默认倍率极其肝，不改的话驯一只霸王龙要几个小时。建议至少把驯服速度调到 3.0 以上。

## 备份

```bash
tar -czf "ark-backup-$(date +%Y%m%d).tar.gz" ShooterGame/Saved/SavedArks/
```
