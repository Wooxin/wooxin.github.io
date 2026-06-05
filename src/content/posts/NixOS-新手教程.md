---
title: NixOS 新手教程——从安装到日常使用
date: 2026-06-05 00:00:00
category:
    - Linux
    - NixOS
tags:
    - Linux
    - NixOS
    - 教程
    - 安装
    - 部署
---

NixOS 是一个与众不同的 Linux 发行版。它的核心卖点就一句话：**用一份配置文件描述整个系统状态，任何改动都可以回滚，环境永远不会因为装了什么而坏掉。**

如果你受够了「装个软件依赖冲突搞崩系统 → 重装 → 又崩」的循环，这篇文章适合你。

> 本文假设你有一台虚拟机或者闲置电脑，会用命令行，知道 `/` 和 `/home` 的区别。

> 我现在的主力办公机就是 Nix 与 Win 双系统 (我有罪, 我抛弃了Arch)

---

## 安装

去 [nixos.org](https://nixos.org) 下载最新 ISO，刻进 U 盘启动。

启动后你会看到一个命令行界面。对，NixOS 的默认安装方式是手动分区 + 命令行，没有图形安装器。

先联网。有线的话插上就行，无线用 `wpa_supplicant`：

```bash
wpa_passphrase "你的WiFi名" "密码" > /etc/wpa_supplicant.conf
wpa_supplicant -B -i wlan0 -c /etc/wpa_supplicant.conf
dhclient wlan0
```

分区。以 EFI + 单根分区为例：

```bash
# 假设磁盘是 /dev/sda
parted /dev/sda -- mklabel gpt
parted /dev/sda -- mkpart ESP fat32 1MiB 512MiB
parted /dev/sda -- set 1 esp on
parted /dev/sda -- mkpart primary ext4 512MiB 100%
```

格式化并挂载：

```bash
mkfs.fat -F 32 /dev/sda1
mkfs.ext4 /dev/sda2
mount /dev/sda2 /mnt
mkdir /mnt/boot
mount /dev/sda1 /mnt/boot
```

生成配置：

```bash
nixos-generate-config --root /mnt
```

这会在 `/mnt/etc/nixos/` 下生成两个文件：

- `configuration.nix` — 系统配置，你要改的东西都在这里
- `hardware-configuration.nix` — 硬件探测结果，**不要手动改**

安装：

```bash
nixos-install
```

安装过程会让你设 root 密码。设完等几分钟，`reboot` 就进去了。

---

## 第一次进系统

默认没有桌面。先看看当前配置长什么样：

```bash
cat /etc/nixos/configuration.nix
```

NixOS 所有系统改动都通过修改这个文件然后重建来完成。没有 `apt install`、没有 `pacman -S`，一切走 `configuration.nix`。

最常用的几个配置块：

```nix
{ config, pkgs, ... }:
{
  # 允许非自由软件（nvidia 驱动、steam 等需要）
  nixpkgs.config.allowUnfree = true;

  # 系统软件包
  environment.systemPackages = with pkgs; [
    vim
    git
    curl
    wget
    htop
    neofetch
  ];

  # 开启 SSH
  services.openssh.enable = true;

  # 时区
  time.timeZone = "Asia/Shanghai";

  # 语言
  i18n.defaultLocale = "zh_CN.UTF-8";
}
```

改完保存，重建：

```bash
nixos-rebuild switch
```

这个命令干的事情：拉取你声明的所有包 → 构建 → 把当前系统切到新版本。如果构建失败，旧系统不受影响。

---

## 装桌面

以 GNOME 为例，在 `configuration.nix` 里加一行：

```nix
services.xserver = {
  enable = true;
  displayManager.gdm.enable = true;
  desktopManager.gnome.enable = true;
};
```

其他桌面同理。KDE：

```nix
services.xserver = {
  enable = true;
  displayManager.sddm.enable = true;
  desktopManager.plasma5.enable = true;
};
```

改完重建：

```bash
nixos-rebuild switch
```

第一次装桌面比较慢，因为要拉整个 GNOME/KDE 生态。后续增量重建就快了。

---

## 装软件

所有软件都在 `environment.systemPackages` 里声明。比如要加 Firefox 和 VSCode：

```nix
environment.systemPackages = with pkgs; [
  vim
  git
  firefox
  vscode
];
```

重建：

```bash
nixos-rebuild switch
```

那如果只是想临时试用一个包、不想写进配置呢？用 `nix-shell`：

```bash
nix-shell -p python3
```

会进入一个临时环境，里面装了 Python。退出环境后 Python 不在系统里留任何痕迹。这就是 Nix 的隔离性——试完就跑，不污染系统。

找包去哪找： https://search.nixos.org/packages

---

## 回滚

这是 NixOS 最香的功能。每次 `nixos-rebuild switch` 都会在启动菜单里追加一个新的入口。重启时你会看到多个 system generation 排成一列。选一个旧的启动，系统就回到了那个时间点的状态——连内核版本都一起滚回去。

也可以在系统里直接切：

```bash
# 列出所有 generation
nixos-rebuild list-generations

# 回滚到上一个
nixos-rebuild switch --rollback
```

理论上你可以滚到一年前的状态、确认一下，再滚回来。这是任何传统包管理器都做不到的。

---

## 清理旧 generation

generation 多了会占空间。定期清：

```bash
# 只保留最近 7 个
sudo nix-collect-garbage --delete-older-than 7d

# 立即清理所有未引用的包
sudo nix-collect-garbage -d
```

---

## 升级系统

升级 NixOS 本身和你装软件是同一个机制：改 channel，重建。

```bash
# 切到 unstable channel（如果当前用的是稳定版）
sudo nix-channel --add https://nixos.org/channels/nixos-unstable nixos
sudo nix-channel --update
nixos-rebuild switch --upgrade
```

`--upgrade` 会更新 channel 后再重建。

---

## Flakes（强力推荐）

上面用的是 NixOS 传统模式。现在社区主流是用 **Flakes**，它在配置顶部加一层锁文件，确保每次重建都是可复现的——同一份配置在不同机器上构建出来完全一致。

把现有配置迁移到 Flakes：

```bash
# 进入配置目录
cd /etc/nixos

# 创建 flake.nix
```

`flake.nix` 内容：

```nix
{
  description = "My NixOS config";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ./configuration.nix
        ./hardware-configuration.nix
      ];
    };
  };
}
```

然后在 `configuration.nix` 上面加一行启用 Flakes：

```nix
{ config, pkgs, lib, ... }:
{
  nix.settings.experimental-features = [ "nix-command" "flakes" ];
  # ... 其余配置
}
```

重建：

```bash
sudo nixos-rebuild switch --flake /etc/nixos#myhost
```

以后所有的 `nixos-rebuild` 都带上 `--flake` 参数。

Flakes 的好处是你把 `/etc/nixos` 文件夹推到 GitHub，换台新机器直接 `git clone` 然后 `nixos-rebuild switch --flake .#myhost`，一台一模一样的系统就出来了。这是真正意义上的 Infrastructure as Code 在桌面端的应用。

---

## 常见坑

1. **`nixos-rebuild switch` 的时候提示 hash mismatch**。改了什么包没更新 lock 文件。用 `nix flake update` 刷新。

2. **NVIDIA 驱动装不上**。确认 `services.xserver.videoDrivers = [ "nvidia" ]` 并且 `nixpkgs.config.allowUnfree = true`。内核版本和驱动版本要匹配。

3. **从其他发行版迁移过来，`/home` 分区保留的话**。挂载 `/home` 之后用 `nixos-generate-config --root /mnt`，它会自动检测并写入 `hardware-configuration.nix`。

4. **Nix 语言和 NixOS 配置是两个东西**。`configuration.nix` 是声明式配置，大部分时候你只需要写 key = value，不需要学 Nix 语言。等需要写复杂模块的时候再学不迟。

5. **不要在 NixOS 里用 `pip install --user` 或者 `npm install -g`**。这些传统包管理器绕开了 Nix 的声明式系统，装了也不会被 Nix 管理，重装系统就丢了。Python 包用 `python3.withPackages`，Node 包用 `nodePackages`。

---

## 小结

NixOS 的学习曲线确实比 Ubuntu 和 Arch 陡，因为它逼你用另一种方式思考系统管理——不是「我装了什么」，而是「我声明了什么」。但这个代价换来的回报是：

- 系统永远不会因为装软件坏掉
- 任何时候都能回滚到之前的精确状态
- 一台机器配好，其他机器直接复用

如果你是一个运维，管着多台服务器或者经常重装系统折腾环境，NixOS 值得花一个周末学会。
