---
title: Factorio 服务器搭建教程
category:
  - 教程
  - 游戏
tags:
  - Factorio
  - 开服
  - 游戏
  - 教程
date: 2024-04-03 13:35:00
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

> Factorio 是所有游戏里部署最省心的——官方直接提供无头服务端，下载解压就能跑。不需要 SteamCMD，不需要 Steam 账号。而且在 Arch 和 NixOS 上甚至有官方仓库包。

Factorio 的多人模式机制很特别：服务器负责运行游戏逻辑，**所有玩家必须完全同步**。这意味着服务器不需要特别强的 CPU——单核性能比多核重要得多。工厂再大，只要没人上线，服务器几乎不吃资源。

<div id="factorio">
<div class="distro-tabs">
  <button class="distro-btn active" data-distro="ubuntu" onclick="switchDistro('factorio','ubuntu')">Ubuntu</button>
  <button class="distro-btn" data-distro="c7" onclick="switchDistro('factorio','c7')">CentOS 7</button>
  <button class="distro-btn" data-distro="c9" onclick="switchDistro('factorio','c9')">CentOS 9</button>
  <button class="distro-btn" data-distro="arch" onclick="switchDistro('factorio','arch')">Arch</button>
  <button class="distro-btn" data-distro="nix" onclick="switchDistro('factorio','nix')">NixOS</button>
</div>
<div class="distro-content">

<div class="distro-code" id="factorio-ubuntu">

```bash
sudo apt update && sudo apt install -y wget tar xz-utils screen

# 从官网下载无头服务端（需要登录 factorio.com 创建账号）
# 去 https://factorio.com/download 找到 Linux headless 的下载链接
wget -O factorio.tar.xz https://factorio.com/get-download/stable/headless/linux64
tar -xJf factorio.tar.xz -C ~/

cd ~/factorio

# 第一次启动：创建世界存档
./bin/x64/factorio --create ./saves/myworld.zip

# 启动服务端（会读取 server-settings.json 里的配置）
./bin/x64/factorio --start-server ./saves/myworld.zip \
  --server-settings ./data/server-settings.example.json
```

</div>
<div class="distro-code" id="factorio-c7">

```bash
sudo yum install -y wget tar xz screen
wget -O factorio.tar.xz https://factorio.com/get-download/stable/headless/linux64
tar -xJf factorio.tar.xz -C ~/
cd ~/factorio
./bin/x64/factorio --create ./saves/myworld.zip
./bin/x64/factorio --start-server ./saves/myworld.zip
```

</div>
<div class="distro-code" id="factorio-c9">

```bash
sudo dnf install -y wget tar xz screen
wget -O factorio.tar.xz https://factorio.com/get-download/stable/headless/linux64
tar -xJf factorio.tar.xz -C ~/
cd ~/factorio
./bin/x64/factorio --create ./saves/myworld.zip
./bin/x64/factorio --start-server ./saves/myworld.zip
```

</div>
<div class="distro-code" id="factorio-arch">

```bash
# Arch 用户直接从 AUR 装
yay -S factorio-headless

# 或手动下载
sudo pacman -S --needed wget tar xz
wget -O factorio.tar.xz https://factorio.com/get-download/stable/headless/linux64
tar -xJf factorio.tar.xz -C ~/
```

</div>
<div class="distro-code" id="factorio-nix">

```nix
# NixOS 最省事——一条配置搞定
services.factorio = {
  enable = true;
  openFirewall = true;
};
# nixos-rebuild switch
```

</div>
</div>
</div>

## server-settings.json 配置

第一次运行时把 `data/server-settings.example.json` 复制一份改成自己的：

```json
{
  "name": "我的 Factorio 工厂",
  "description": "欢迎来搬砖",
  "max_players": 16,
  "visibility": { "public": true, "lan": true },
  "username": "",
  "password": "",
  "game_password": "secret",
  "auto_pause": false
}
```

- `auto_pause` 设为 `false` 的话没人上线也不会暂停工厂，生产线 24 小时运转
- `game_password` 设了只有知道密码的人能进

## 端口

默认 `34197` UDP。如果开多个服，端口号递增：

```bash
sudo ufw allow 34197/udp
sudo firewall-cmd --add-port=34197/udp --permanent && sudo firewall-cmd --reload
```

## 存档

Factorio 存档在 `saves/` 目录下，`.zip` 文件。极其紧凑——一个几千小时的工厂存档可能只有几十 MB。备份：

```bash
cp saves/myworld.zip "saves/myworld-$(date +%Y%m%d).zip"
```
