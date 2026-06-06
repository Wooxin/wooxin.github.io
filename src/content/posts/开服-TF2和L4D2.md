---
title: TF2 和 Left 4 Dead 2 服务器搭建教程
category:
  - 教程
  - 游戏
tags:
  - TF2
  - L4D2
  - 开服
  - 游戏
  - 教程
date: 2024-04-03 13:45:00
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

> Team Fortress 2（军团要塞 2）和 Left 4 Dead 2（求生之路 2）都是 Valve 的 Source 引擎游戏。部署流程完全相同——都是 SteamCMD 下载 + `srcds_run` 启动。所以放一起讲。

Source 引擎的服务端部署是所有游戏里最简单的——不需要额外的运行库，不需要手动创建存档，不需要 Token。下载完直接就能跑。

## Team Fortress 2 — App ID `232250`

TF2 是免费的团队合作射击游戏，服务端完全免费，不需要 Steam 账号认证。

<div id="tf2">
<div class="distro-tabs">
  <button class="distro-btn active" data-distro="ubuntu" onclick="switchDistro('tf2','ubuntu')">Ubuntu</button>
  <button class="distro-btn" data-distro="c7" onclick="switchDistro('tf2','c7')">CentOS 7</button>
  <button class="distro-btn" data-distro="c9" onclick="switchDistro('tf2','c9')">CentOS 9</button>
  <button class="distro-btn" data-distro="arch" onclick="switchDistro('tf2','arch')">Arch</button>
  <button class="distro-btn" data-distro="nix" onclick="switchDistro('tf2','nix')">NixOS</button>
</div>
<div class="distro-content">

<div class="distro-code" id="tf2-ubuntu">

```bash
sudo dpkg --add-architecture i386
sudo apt update && sudo apt install -y steamcmd lib32gcc-s1 screen

mkdir -p ~/tf2 && cd ~/tf2
steamcmd +force_install_dir ./server +login anonymous +app_update 232250 validate +quit

cd server
./srcds_run -game tf -console +map ctf_2fort +maxplayers 24
```

</div>
<div class="distro-code" id="tf2-c7">

```bash
sudo yum install -y glibc.i686 libstdc++.i686 steamcmd screen
mkdir ~/tf2 && cd ~/tf2
steamcmd +force_install_dir ./server +login anonymous +app_update 232250 validate +quit
cd server && ./srcds_run -game tf -console +map ctf_2fort +maxplayers 24
```

</div>
<div class="distro-code" id="tf2-c9">

```bash
sudo dnf install -y glibc.i686 libstdc++.i686 steamcmd screen
mkdir ~/tf2 && cd ~/tf2
steamcmd +force_install_dir ./server +login anonymous +app_update 232250 validate +quit
cd server && ./srcds_run -game tf -console +map ctf_2fort +maxplayers 24
```

</div>
<div class="distro-code" id="tf2-arch">

```bash
sudo pacman -Syu steamcmd lib32-gcc-libs screen
mkdir ~/tf2 && cd ~/tf2
steamcmd +force_install_dir ./server +login anonymous +app_update 232250 validate +quit
cd server && ./srcds_run -game tf -console +map ctf_2fort +maxplayers 24
```

</div>
<div class="distro-code" id="tf2-nix">

```nix
environment.systemPackages = with pkgs; [ steamcmd ];
```

```bash
mkdir ~/tf2 && cd ~/tf2
steamcmd +force_install_dir ./server +login anonymous +app_update 232250 validate +quit
cd server && ./srcds_run -game tf -console +map ctf_2fort +maxplayers 24
```

</div>
</div>
</div>

## Left 4 Dead 2 — App ID `222860`

L4D2 的部署命令和 TF2 只差在 App ID 和游戏名：

<div id="l4d2">
<div class="distro-tabs">
  <button class="distro-btn active" data-distro="ubuntu" onclick="switchDistro('l4d2','ubuntu')">Ubuntu</button>
  <button class="distro-btn" data-distro="c7" onclick="switchDistro('l4d2','c7')">CentOS 7</button>
  <button class="distro-btn" data-distro="c9" onclick="switchDistro('l4d2','c9')">CentOS 9</button>
  <button class="distro-btn" data-distro="arch" onclick="switchDistro('l4d2','arch')">Arch</button>
  <button class="distro-btn" data-distro="nix" onclick="switchDistro('l4d2','nix')">NixOS</button>
</div>
<div class="distro-content">

<div class="distro-code" id="l4d2-ubuntu">

```bash
sudo dpkg --add-architecture i386
sudo apt update && sudo apt install -y steamcmd lib32gcc-s1 screen

mkdir -p ~/l4d2 && cd ~/l4d2
steamcmd +force_install_dir ./server +login anonymous +app_update 222860 validate +quit

cd server
./srcds_run -game left4dead2 -console +map c1m1_hotel +maxplayers 8
```

</div>
<div class="distro-code" id="l4d2-c7">

```bash
sudo yum install -y glibc.i686 libstdc++.i686 steamcmd screen
mkdir ~/l4d2 && cd ~/l4d2
steamcmd +force_install_dir ./server +login anonymous +app_update 222860 validate +quit
cd server && ./srcds_run -game left4dead2 -console +map c1m1_hotel
```

</div>
<div class="distro-code" id="l4d2-c9">

```bash
sudo dnf install -y glibc.i686 libstdc++.i686 steamcmd screen
mkdir ~/l4d2 && cd ~/l4d2
steamcmd +force_install_dir ./server +login anonymous +app_update 222860 validate +quit
cd server && ./srcds_run -game left4dead2 -console +map c1m1_hotel
```

</div>
<div class="distro-code" id="l4d2-arch">

```bash
sudo pacman -Syu steamcmd lib32-gcc-libs screen
mkdir ~/l4d2 && cd ~/l4d2
steamcmd +force_install_dir ./server +login anonymous +app_update 222860 validate +quit
cd server && ./srcds_run -game left4dead2 -console +map c1m1_hotel
```

</div>
<div class="distro-code" id="l4d2-nix">

```nix
environment.systemPackages = with pkgs; [ steamcmd ];
```

```bash
mkdir ~/l4d2 && cd ~/l4d2
steamcmd +force_install_dir ./server +login anonymous +app_update 222860 validate +quit
cd server && ./srcds_run -game left4dead2 -console +map c1m1_hotel
```

</div>
</div>
</div>

## Source 引擎服务器配置

服务端配置文件在 `游戏名/cfg/server.cfg`。以 TF2 为例，在 `tf2/tf/cfg/server.cfg` 里写：

```
hostname "我的TF2服务器"        // 服务器名称
sv_password "secret"             // 密码（不设就是公开的）
sv_contact "admin@example.com"   // 管理员联系方式
mp_timelimit 30                  // 每局时间（分钟）
mp_friendlyfire 0                // 友军伤害（0=关，1=开）
sv_region 4                      // 服务器地区（4=亚洲）
```

L4D2 的配置文件在 `l4d2/left4dead2/cfg/server.cfg`。

## 管理命令

在服务端控制台（或在游戏里输入 `rcon_password` 后）：

```
status          # 查看在线玩家
kick "名字"     # 踢人
changelevel c1m2_streets  # 切换地图
```

## 端口

TF2 和 L4D2 都默认使用 `27015` UDP + TCP：

```bash
sudo ufw allow 27015
sudo ufw allow 27015/udp
```

## Source 引擎通用注意事项

- 所有使用 `srcds_run` 启动的游戏都需要 32 位兼容库（`lib32gcc`）
- 地图名区分大小写
- 服务端第一次启动会自动生成 `cfg/server.cfg`，你需要手动编辑它
- 下载量：TF2 约 15GB，L4D2 约 13GB
