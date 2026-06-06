---
title: Terraria 服务器搭建教程
category:
  - 教程
  - 游戏
tags:
  - Terraria
  - 开服
  - 游戏
  - 教程
date: 2024-04-03 13:10:00
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

> Terraria（泰拉瑞亚）的服务端是官方直接提供的，不需要 SteamCMD 那套东西。下载解压就能跑。这篇从零开始，不需要 Linux 经验。

## Terraria 服务器和单人游戏有什么区别

单人模式下你的电脑同时承担两个角色：计算游戏逻辑（怪物 AI、物品掉落、地图生成）+ 渲染画面。开服务器后这两个角色分开了：

- 服务器只负责计算游戏逻辑
- 你的电脑只负责渲染画面

开服的好处：
- 朋友可以随时上线玩，不需要房主在线
- 存档在服务器上，不会因为谁电脑坏了就丢档
- 服务器配置可以调（密码、最大人数、PVP 开关等）

点击标签选你的系统：

<div id="terraria">
<div class="distro-tabs">
  <button class="distro-btn active" data-distro="ubuntu" onclick="switchDistro('terraria','ubuntu')">Ubuntu</button>
  <button class="distro-btn" data-distro="c7" onclick="switchDistro('terraria','c7')">CentOS 7</button>
  <button class="distro-btn" data-distro="c9" onclick="switchDistro('terraria','c9')">CentOS 9</button>
  <button class="distro-btn" data-distro="arch" onclick="switchDistro('terraria','arch')">Arch</button>
  <button class="distro-btn" data-distro="nix" onclick="switchDistro('terraria','nix')">NixOS</button>
</div>
<div class="distro-content">

<div class="distro-code" id="terraria-ubuntu">

```bash
# 装几个工具：wget 下载文件，unzip 解压，screen 后台运行
sudo apt update
sudo apt install -y wget unzip screen

# 下载官方服务端（这个链接是官方的，直接访问就行）
wget https://terraria.org/api/download/pc-dedicated-server/terraria-server-linux.zip

# 解压到 terraria 文件夹
unzip terraria-server-linux.zip -d terraria

# 进入 Linux 版目录
cd terraria/linux

# 第一次启动：程序会问你几个问题（选世界、设人数、设密码等）
# 答完之后服务端会生成一个 serverconfig.txt 文件
./TerrariaServer.bin.x86_64 -config serverconfig.txt
```

</div>
<div class="distro-code" id="terraria-c7">

```bash
sudo yum install -y wget unzip screen
wget https://terraria.org/api/download/pc-dedicated-server/terraria-server-linux.zip
unzip terraria-server-linux.zip -d terraria
cd terraria/linux
./TerrariaServer.bin.x86_64 -config serverconfig.txt
```

</div>
<div class="distro-code" id="terraria-c9">

```bash
sudo dnf install -y wget unzip screen
wget https://terraria.org/api/download/pc-dedicated-server/terraria-server-linux.zip
unzip terraria-server-linux.zip -d terraria
cd terraria/linux
./TerrariaServer.bin.x86_64 -config serverconfig.txt
```

</div>
<div class="distro-code" id="terraria-arch">

```bash
sudo pacman -S --needed wget unzip screen
# Arch AUR 甚至有人打包好了
yay -S terraria-server
```

</div>
<div class="distro-code" id="terraria-nix">

```bash
wget https://terraria.org/api/download/pc-dedicated-server/terraria-server-linux.zip
unzip terraria-server-linux.zip -d terraria
cd terraria/linux
./TerrariaServer.bin.x86_64 -config serverconfig.txt
```

</div>
</div>
</div>

## 配置 serverconfig.txt

第一次运行后，`terraria/linux` 目录下会生成 `serverconfig.txt`。关键参数：

```
# 世界文件路径
world=/home/YOUR_USER/.local/share/Terraria/Worlds/world1.wld

# 自动创建世界尺寸（1=小，2=中，3=大）
autocreate=2

# 世界名称
worldname=MyTerrariaWorld

# 难度（0=普通，1=专家，2=大师）
difficulty=0

# 最大玩家数（最大 255）
maxplayers=16

# 端口
port=7777

# 服务器密码（不设就是公开服）
password=yourpassword

# 进服欢迎语
motd=欢迎来到我的泰拉服务器！

# 语言（enUS / zhHans）
language=zhHans
```

改完保存，重新运行 `./TerrariaServer.bin.x86_64 -config serverconfig.txt` 生效。

## systemd 服务

```bash
sudo cat > /etc/systemd/system/terraria.service << 'EOF'
[Unit]
Description=Terraria Server
After=network.target

[Service]
User=root
WorkingDirectory=/root/terraria/linux
ExecStart=/root/terraria/linux/TerrariaServer.bin.x86_64 -config /root/terraria/linux/serverconfig.txt
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now terraria
```

## 端口

默认端口 `7777`：

```bash
sudo ufw allow 7777/tcp
# 或
sudo firewall-cmd --add-port=7777/tcp --permanent && sudo firewall-cmd --reload
```

## 备份世界

Terraria 的世界文件在 `.local/share/Terraria/Worlds/` 目录下，`.wld` 后缀：

```bash
tar -czf "terraria-backup-$(date +%Y%m%d).tar.gz" ~/.local/share/Terraria/Worlds/
```

> 即使有自动保存，世界文件也可能在停电或进程被强杀时损坏。定期备份 + 手动输入 `save` 命令保存是铁律。
