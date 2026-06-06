---
title: CS2 服务器搭建教程
category:
  - 教程
  - 游戏
tags:
  - CS2
  - 开服
  - 游戏
  - 教程
date: 2024-04-03 13:05:00
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

> CS2（原 CS:GO）服务端通过 SteamCMD 下载。SteamCMD 是 Valve 的命令行工具，专门用来下载和管理游戏服务器。这篇从零开始讲，不需要任何经验。

## SteamCMD 是什么？

SteamCMD 是 Steam 的命令行版本——没有图形界面，所有操作敲命令完成。它用来下载、更新 Steam 上的游戏服务端。CS2、Valheim、Palworld、Rust、ARK、七日杀……绝大多数 Steam 游戏的服务端都靠它来装。

它用 `app_update` 命令加一个数字 ID（叫 App ID）来知道你要下载哪个游戏。CS2 的 App ID 是 `730`。

下载时需要登录，但 Steam 的游戏服务端允许**匿名登录**——不需要注册 Steam 账号。

## 你需要什么

- 一台 Linux 服务器（2 核 4G 内存起步，玩家多了加配置）
- 服务器能上网
- 大概 40GB 硬盘空间（CS2 服务端不小）

点击下面的标签选择你的系统：

<div id="cs2">
<div class="distro-tabs">
  <button class="distro-btn active" data-distro="ubuntu" onclick="switchDistro('cs2','ubuntu')">Ubuntu</button>
  <button class="distro-btn" data-distro="c7" onclick="switchDistro('cs2','c7')">CentOS 7</button>
  <button class="distro-btn" data-distro="c9" onclick="switchDistro('cs2','c9')">CentOS 9</button>
  <button class="distro-btn" data-distro="arch" onclick="switchDistro('cs2','arch')">Arch</button>
  <button class="distro-btn" data-distro="nix" onclick="switchDistro('cs2','nix')">NixOS</button>
</div>
<div class="distro-content">

<div class="distro-code" id="cs2-ubuntu">

```bash
# 1. 让系统支持 32 位程序（很多游戏服务端还是 32 位的）
# dpkg --add-architecture i386 告诉包管理器：我可能要装 32 位的软件
sudo dpkg --add-architecture i386

# 2. 更新并安装依赖
# steamcmd 是下载工具，lib32gcc-s1 是 32 位运行库（没有它服务端跑不起来）
sudo apt update
sudo apt install -y steamcmd lib32gcc-s1 screen

# 3. 创建文件夹
mkdir -p ~/cs2 && cd ~/cs2

# 4. 用 SteamCMD 下载 CS2 服务端
# force_install_dir 指定安装到哪里
# login anonymous 表示匿名登录
# app_update 730 表示下载 App ID 为 730 的游戏（CS2）
# validate 表示下载完成后校验文件完整性
steamcmd +force_install_dir ./cs2-server +login anonymous +app_update 730 validate +quit

# 5. 进入启动目录
cd cs2-server/game/bin/linuxsteamrt64

# 6. 启动！
# -dedicated 表示专用服务器模式
# +map de_dust2 指定初始地图
# +maxplayers 16 最大玩家数
# +sv_setsteamaccount 后面填你的 Token
./cs2 -dedicated -map de_dust2 -maxplayers 16 +sv_setsteamaccount YOUR_TOKEN
```

</div>
<div class="distro-code" id="cs2-c7">

```bash
sudo yum install -y epel-release
sudo yum install -y glibc.i686 libstdc++.i686 steamcmd screen

mkdir ~/cs2 && cd ~/cs2
steamcmd +force_install_dir ./cs2-server +login anonymous +app_update 730 validate +quit

cd cs2-server/game/bin/linuxsteamrt64
./cs2 -dedicated -map de_dust2 -maxplayers 16 +sv_setsteamaccount YOUR_TOKEN
```

</div>
<div class="distro-code" id="cs2-c9">

```bash
sudo dnf install -y epel-release
sudo dnf install -y glibc.i686 libstdc++.i686 steamcmd screen

mkdir ~/cs2 && cd ~/cs2
steamcmd +force_install_dir ./cs2-server +login anonymous +app_update 730 validate +quit

cd cs2-server/game/bin/linuxsteamrt64
./cs2 -dedicated -map de_dust2 -maxplayers 16 +sv_setsteamaccount YOUR_TOKEN
```

</div>
<div class="distro-code" id="cs2-arch">

```bash
# Arch 默认不安装 32 位库，需要手动启用 multilib 仓库
# 编辑 /etc/pacman.conf，把 [multilib] 这段取消注释
sudo sed -i '/\[multilib\]/,/Include/ s/^#//' /etc/pacman.conf
sudo pacman -Syu steamcmd lib32-gcc-libs screen

mkdir ~/cs2 && cd ~/cs2
steamcmd +force_install_dir ./cs2-server +login anonymous +app_update 730 validate +quit

cd cs2-server/game/bin/linuxsteamrt64
./cs2 -dedicated -map de_dust2 -maxplayers 16 +sv_setsteamaccount YOUR_TOKEN
```

</div>
<div class="distro-code" id="cs2-nix">

```nix
environment.systemPackages = with pkgs; [ steamcmd ];
# 运行 sudo nixos-rebuild switch 使配置生效
```

```bash
mkdir ~/cs2 && cd ~/cs2
steamcmd +force_install_dir ./cs2-server +login anonymous +app_update 730 validate +quit

cd cs2-server/game/bin/linuxsteamrt64
./cs2 -dedicated -map de_dust2 -maxplayers 16 +sv_setsteamaccount YOUR_TOKEN
```

</div>
</div>
</div>

## 获取 GSLT Token（Game Server Login Token）

启动命令里的 `YOUR_TOKEN` 必须换成真实的 Token，否则服务器不会出现在 CS2 的服务器浏览器里。

获取步骤：
1. 用浏览器打开 https://steamcommunity.com/dev/managegameservers
2. 登录你的 Steam 账号
3. 在 App ID 输入框里填 `730`（CS2 的 App ID）
4. 在备忘录里填一个名字（随便写，比如「我的CS2服」）
5. 点「创建」，复制生成的那串 Token（类似 `A1B2C3D4E5F6...`）
6. 把启动命令里的 `YOUR_TOKEN` 替换成这串字符

> Token 和你的 Steam 账号绑定。如果发现无法创建，你可能需要先在自己的 Steam 上消费满 5 美元（Steam 的防机器人机制）。

## 让服务器后台常驻

和 Minecraft 一样，用 screen 或 systemd。推荐 systemd：

```bash
sudo cat > /etc/systemd/system/cs2.service << 'EOF'
[Unit]
Description=CS2 Server
After=network.target

[Service]
User=root
WorkingDirectory=/root/cs2/cs2-server/game/bin/linuxsteamrt64
ExecStart=/root/cs2/cs2-server/game/bin/linuxsteamrt64/cs2 -dedicated -map de_dust2 -maxplayers 16 +sv_setsteamaccount YOUR_TOKEN
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now cs2
```

## 端口与防火墙

CS2 使用 UDP 协议，默认端口 `27015`。如果开多个服，端口递增（27016、27017...）：

```bash
# Ubuntu——ufw
sudo ufw allow 27015/udp

# CentOS——firewalld
sudo firewall-cmd --add-port=27015/udp --permanent
sudo firewall-cmd --reload

# 通用 iptables
sudo iptables -A INPUT -p udp --dport 27015 -j ACCEPT
```

> 注意：`udp` 不是 `tcp`。CS2 的网络通信全部走 UDP。很多人设了 tcp 然后说连不上，问题就出在这里。

## 更新服务端

Valve 会不定期更新 CS2。服务端不跟着更新的话，客户端版本对不上就进不去。更新非常简单——再跑一次 SteamCMD 下载：

```bash
cd ~/cs2
steamcmd +force_install_dir ./cs2-server +login anonymous +app_update 730 validate +quit
sudo systemctl restart cs2
```

建议设个 cron 定时任务每天凌晨自动更新：

```bash
echo "0 4 * * * cd ~/cs2 && steamcmd +force_install_dir ./cs2-server +login anonymous +app_update 730 validate +quit && systemctl restart cs2" | crontab -
```

## 常用启动参数

```bash
./cs2 -dedicated \
  +map de_dust2 \          # 初始地图
  +mapgroup mg_active \    # 地图组
  +maxplayers 16 \         # 最大玩家
  +game_type 0 \           # 0=休闲 1=竞技
  +game_mode 0 \           # 0=经典
  +sv_setsteamaccount TOKEN \
  +sv_hostname "我的CS2服务器" \
  +sv_password "" \        # 设密码的话需要密码才能进
  +rcon_password "admin123" # 远程管理密码
```

`rcon_password` 设了之后，你可以在游戏控制台里敲 `rcon_password admin123` 然后 `rcon kick 玩家名` 远程管理服务器，不需要登录服务器 SSH。
