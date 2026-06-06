---
title: Valheim 服务器搭建教程
category:
  - 教程
  - 游戏
tags:
  - Valheim
  - 开服
  - 游戏
  - 教程
date: 2024-04-03 13:15:00
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

> Valheim（英灵神殿）通过 SteamCMD 部署，App ID `896660`。需要 32 位兼容库。

Valheim 服务器的特色是——世界存档和你自己的角色是分开的。服务器只存世界的状态（你盖的房子、挖的矿、打的 Boss），你的角色属性存在自己电脑上。所以换服务器不会丢角色等级。

<div id="valheim">
<div class="distro-tabs">
  <button class="distro-btn active" data-distro="ubuntu" onclick="switchDistro('valheim','ubuntu')">Ubuntu</button>
  <button class="distro-btn" data-distro="c7" onclick="switchDistro('valheim','c7')">CentOS 7</button>
  <button class="distro-btn" data-distro="c9" onclick="switchDistro('valheim','c9')">CentOS 9</button>
  <button class="distro-btn" data-distro="arch" onclick="switchDistro('valheim','arch')">Arch</button>
  <button class="distro-btn" data-distro="nix" onclick="switchDistro('valheim','nix')">NixOS</button>
</div>
<div class="distro-content">

<div class="distro-code" id="valheim-ubuntu">

```bash
sudo dpkg --add-architecture i386
sudo apt update && sudo apt install -y steamcmd lib32gcc-s1 screen

mkdir -p ~/valheim && cd ~/valheim
steamcmd +force_install_dir ./server +login anonymous +app_update 896660 validate +quit

cd server
./valheim_server.x86_64 -name "My Server" -port 2456 -world "MyWorld" -password "secret"
```

</div>
<div class="distro-code" id="valheim-c7">

```bash
sudo yum install -y glibc.i686 libstdc++.i686 steamcmd screen
mkdir ~/valheim && cd ~/valheim
steamcmd +force_install_dir ./server +login anonymous +app_update 896660 validate +quit
cd server
./valheim_server.x86_64 -name "My Server" -port 2456 -world "MyWorld" -password "secret"
```

</div>
<div class="distro-code" id="valheim-c9">

```bash
sudo dnf install -y glibc.i686 libstdc++.i686 steamcmd screen
mkdir ~/valheim && cd ~/valheim
steamcmd +force_install_dir ./server +login anonymous +app_update 896660 validate +quit
cd server
./valheim_server.x86_64 -name "My Server" -port 2456 -world "MyWorld" -password "secret"
```

</div>
<div class="distro-code" id="valheim-arch">

```bash
sudo sed -i '/\[multilib\]/,/Include/ s/^#//' /etc/pacman.conf
sudo pacman -Syu steamcmd lib32-gcc-libs screen
mkdir ~/valheim && cd ~/valheim
steamcmd +force_install_dir ./server +login anonymous +app_update 896660 validate +quit
cd server
./valheim_server.x86_64 -name "My Server" -port 2456 -world "MyWorld" -password "secret"
```

</div>
<div class="distro-code" id="valheim-nix">

```nix
environment.systemPackages = with pkgs; [ steamcmd ];
```

```bash
mkdir ~/valheim && cd ~/valheim
steamcmd +force_install_dir ./server +login anonymous +app_update 896660 validate +quit
cd server
./valheim_server.x86_64 -name "My Server" -port 2456 -world "MyWorld" -password "secret"
```

</div>
</div>
</div>

## 启动参数说明

```
-name "My Server"     # 服务器名称（显示在服务器列表里）
-port 2456            # 游戏端口
-world "MyWorld"      # 世界名称（存档文件名）
-password "secret"    # 密码（不设的话任何知道 IP 的人都能进）
-public 1             # 设为 0 的话不显示在公开服务器列表
```

## 端口

Valheim 占三个连续端口，默认 `2456`、`2457`、`2458`。建议配成范围：

```bash
sudo ufw allow 2456:2458/udp
sudo firewall-cmd --add-port=2456-2458/udp --permanent && sudo firewall-cmd --reload
```

## 服务器管理命令

在服务器控制台里可以输入这些命令：

```
help            # 列出所有命令
kick 玩家名     # 踢人
ban 玩家名       # 封禁
unban 玩家名     # 解封
save            # 手动保存世界
```

## systemd 服务

```bash
sudo cat > /etc/systemd/system/valheim.service << 'EOF'
[Unit]
Description=Valheim Server
After=network.target

[Service]
User=root
WorkingDirectory=/root/valheim/server
ExecStart=/root/valheim/server/valheim_server.x86_64 -name "My Server" -port 2456 -world "MyWorld" -password "secret"
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now valheim
```

## 备份世界

世界存档在 `~/.config/unity3d/IronGate/Valheim/worlds_local/` 目录下：

```bash
tar -czf "valheim-backup-$(date +%Y%m%d).tar.gz" ~/.config/unity3d/IronGate/Valheim/worlds_local/
```
