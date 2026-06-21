---
title: 我自己的 NixOS 部署过程与遇到的问题
date: 2026-06-14 18:30:06
category:
  - Linux
  - NixOS
tags:
  - Linux
  - NixOS
  - 教程
  - 安装
  - 部署
description: NixOS的进阶教程, 这是博主自己的电脑部署的NixOS, 遇到的问题都被一一解决
---

折腾 Linux 这么久，NixOS 一直是"听说很强但懒得学"的存在。最近重整笔记本，一口气上了 Niri + Wayland + Flakes + Limine + Btrfs。

本文上半部分是速通安装指南，下半部分是踩坑速查手册。有 Linux 基础的跟着做就行。

**硬件环境**：ASUS ZenBook 14 / Intel Ultra 9 185H / Intel Arc 核显 / Intel AX211 WiFi

**磁盘布局**：nvme0n1p1-p2 Windows，p3 NixOS（Btrfs），p4 EFI（FAT32）

---

# 一、安装教程

## 1. 分区与 Btrfs 子卷

别直接 `p3 -> /` `p4 -> /home`，浪费了 Btrfs 快照能力。正确做法：

```bash
btrfs subvolume create /mnt/@
btrfs subvolume create /mnt/@home
btrfs subvolume create /mnt/@nix
btrfs subvolume create /mnt/@snapshots

mount -o subvol=@,compress=zstd,noatime /dev/nvme0n1p3 /mnt
```

挂载参数是 `subvol`，别写成 `subvo1`（数字1），别问我怎么知道的。

## 2. 网络（安装阶段）

WiFi 网卡可能不会自动加载：

```bash
ip link            # 只有 lo
lsmod | grep iwl  # 没输出
modprobe iwlwifi  # 手动加载
ip link            # wlan0 出现了
```

iwd 扫描没输出是正常的，别慌：

```bash
iwctl station wlan0 scan
iwctl wlan0 get-networks
iwctl station wlan0 connect WIFI名称
```

## 3. 安装 NixOS

```bash
nixos-generate-config --root /mnt
nixos-install
```

下载慢加国内镜像：

```nix
nix.settings.substituters = [
  "https://mirrors.tuna.tsinghua.edu.cn/nix-channels/store"
  "https://cache.nixos.org/"
];
```

## 4. 引导：Limine

Systemd-boot 用腻了，换 Limine 支持快照菜单：

```nix
boot.loader.systemd-boot.enable = false;
boot.loader.limine.enable = true;
boot.loader.limine.efiSupport = true;
```

快照太多时清理：

```bash
sudo nix-env -p /nix/var/nix/profiles/system --delete-generations +10
sudo nix-collect-garbage -d
```

## 5. 创建用户

不配用户装完只有 root：

```nix
users.users.username = {
  isNormalUser = true;
  extraGroups = [ "wheel" "video" "audio" "input" ];
  shell = pkgs.bash;
};
```

## 6. 桌面环境：Niri

没用 KDE/GNOME，直接上 Niri（Wayland 原生滚动式布局，占用低）。

登录器用 tuigreet：

```nix
services.greetd = {
  enable = true;
  settings.default_session.command =
    "${pkgs.tuigreet}/bin/tuigreet --cmd niri-session";
};
```

输入法 Fcitx5 + Rime：

```nix
i18n.inputMethod = {
  enable = true;
  type = "fcitx5";
  fcitx5.addons = with pkgs; [
    fcitx5-rime
    qt6Packages.fcitx5-chinese-addons
  ];
};
```

窗口规则——查询 AppID 用 `niri msg windows`，多个 AppID 匹配要分开写：

```kdl
window-rule {
    match app-id="blueman"
    match app-id="org.twosheds.iwgtk"
    open-floating true
    min-width 600
    max-width 600
    min-height 400
    max-height 400
}
```

## 7. 软件选择

终端 Kitty（稳定成熟，没用 Ghostty），编辑器 Neovim：

```nix
programs.neovim = {
  enable = true;
  defaultEditor = true;
  viAlias = true;
  vimAlias = true;
};
```

文件管理器 Yazi（Rust 写的，快，Wayland 支持好）。

Niri 生态推荐：

```nix
# 保留
kitty waybar fuzzel grim slurp wl-clipboard cliphist
swaylock-effects pamixer brightnessctl iwgtk

# 新增
swappy wf-recorder pavucontrol playerctl nautilus
p7zip unrar zathura swaynotificationcenter lazygit

# 壁纸工具用 swww 不要用 awww
```

## 8. 配置模块化 + Flakes

```text
/etc/nixos
├── flake.nix
├── configuration.nix      # 只管安装
├── hardware-configuration.nix
├── hardware/asus.nix
├── services/ssh.nix fcitx5.nix bluetooth.nix pipewire.nix
└── software/kitty.nix niri.nix waybar.nix mako.nix fuzzel.nix yazi.nix neovim.nix
```

迁移到 Flakes 后重建命令：

```bash
sudo nixos-rebuild switch --flake /etc/nixos#WoxLinux
```

好处：可复现、Git 管理、多机同步、Home Manager 整合。

## 9. ASUS 专属

```nix
services.asusd.enable = true;
environment.systemPackages = with pkgs; [ asusctl ];

# cachyos 内核不在官方 nixpkgs，用 latest 替代
boot.kernelPackages = pkgs.linuxPackages_latest;
```

## 10. 非自由软件

装 Chrome、QQ、微信、Obsidian 必须先开：

```nix
nixpkgs.config.allowUnfree = true;
```

自动锁屏/关屏/睡眠：

```nix
services.swayidle = {
  enable = true;
  timeouts = [
    { timeout = 300;  command = "swaylock"; }
    { timeout = 600;  command = "niri msg action power-off-monitors";
                      resumeCommand = "niri msg action power-on-monitors"; }
    { timeout = 1800; command = "systemctl suspend"; }
  ];
};
```

---

# 二、踩坑与解决

## 代理问题（重灾区）

### FlClash 节点正常但系统代理没生效

**现象**：FlClash 节点正常，curl 走代理正常，但系统不代理

```bash
curl --proxy http://127.0.0.1:7890 https://ip.sb  # 香港IP = 节点正常
curl https://ip.sb                                  # 国内IP = 系统代理没生效
env | grep -i proxy                                 # 输出为空 = 环境变量没注入
```

**解决**：Niri 没有 gsettings/kwriteconfig，FlClash 无法写入系统代理。装 GNOME 代理接口：

```nix
environment.systemPackages = with pkgs; [ glib dconf gsettings-desktop-schemas ];
```

然后在 FlClash GUI 里开启 System Proxy（不是手动改 YAML）。

### FlClash TUN 重启后自动变 false

**现象**：每次重启 TUN 模式都被关掉

**解决**：直接改 `~/.local/share/com.follow.clash/config.yaml` 没用，GUI 会覆盖。正确做法：FlClash GUI → Settings → Network → TUN 里开启。

TUN 没创建时 `ip link` 只看到 `lo` 和 `wlan0`，没有 `tun0`。检查权限：

```bash
getcap FlClashCore  # 无输出说明 cap_net_admin 缺失
```

### Chrome 不走代理

**现象**：Chrome 在 Niri 下不读 Shell 环境变量，只认 GNOME/KDE 代理配置或启动参数

**解决**：最省事的包装器：

```bash
mkdir -p ~/.local/bin
cat > ~/.local/bin/google-chrome << 'EOF'
#!/usr/bin/env bash
exec /run/current-system/sw/bin/google-chrome-stable \
    --proxy-server=http://127.0.0.1:7890 "$@"
EOF
chmod +x ~/.local/bin/google-chrome
```

### nixos-rebuild 无法访问 GitHub

**现象**：curl 能访问 GitHub，但 `sudo nixos-rebuild switch` 报 `Failed to connect to github.com port 443`

**解决**：nix-daemon 不继承用户代理，sudo 和普通用户是两个世界：

```nix
systemd.services.nix-daemon.environment = {
  http_proxy = "http://127.0.0.1:7890";
  https_proxy = "http://127.0.0.1:7890";
  HTTP_PROXY = "http://127.0.0.1:7890";
  HTTPS_PROXY = "http://127.0.0.1:7890";
};
```

### 完整代理配置（缺一不可）

```nix
# 用户空间代理
environment.sessionVariables = {
  http_proxy = "http://127.0.0.1:7890";
  https_proxy = "http://127.0.0.1:7890";
  HTTP_PROXY = "http://127.0.0.1:7890";
  HTTPS_PROXY = "http://127.0.0.1:7890";
};

# nix-daemon 代理（解决 sudo 下裸奔问题）
systemd.services.nix-daemon.environment = {
  http_proxy = "http://127.0.0.1:7890";
  https_proxy = "http://127.0.0.1:7890";
  HTTP_PROXY = "http://127.0.0.1:7890";
  HTTPS_PROXY = "http://127.0.0.1:7890";
};
```

配好之后 Chrome、Git、Nix、nixos-rebuild、curl 全部正常。

## Howdy 人脸识别

### 找红外摄像头

```bash
v4l2-ctl --list-devices
mpv av://v4l2:/dev/video0  # 彩色 = 普通摄像头
mpv av://v4l2:/dev/video2  # 黑白 = IR 摄像头
```

配置文件位置：

```bash
find /nix/store -name config.ini | grep howdy
```

### 配置格式必须带 section header

**现象**：报 `MissingSectionHeaderError`

**解决**：

```ini
# 错误
device_path = /dev/video2

# 正确
[video]
device_path=/dev/video2
```

### 曝光过度（整张脸纯白）

**现象**：Howdy 画面一片纯白，识别不了

**解决**：调了一下午，别问我怎么知道的：

```ini
[video]
exposure=40   # 或者 20，看情况
```

调完重新录入：

```bash
sudo howdy remove 0
sudo howdy add
```

### 启用 sudo 刷脸

```nix
services.howdy.enable = true;
security.pam.services.sudo.howdy = {
  enable = true;
  control = "sufficient";
};
```

验证：`cat /etc/pam.d/sudo` 里有 `pam_howdy.so` 就对了。

### 识别成功但提示密码错误

**现象**：`Identified face as username` → `Authentication failed`

**解决**：PAM 认了但 SDDM 没接入。先保证 sudo 刷脸正常再排查登录器，别一上来就死磕 SDDM。

## 其他问题

### 腾讯会议构建报错

**现象**：`Failed to connect github.com`

**解决**：`wemeet-wayland-screenshare` 需要访问 GitHub，先配好代理再重建，或者暂时移除。

### Home Manager 激活失败

**现象**：

```text
Existing file '/home/username/.config/kitty/kitty.conf' would be clobbered
```

**解决**：Home Manager 不覆盖已存在的文件，备份一下再重建：

```bash
mv ~/.config/kitty/kitty.conf ~/.config/kitty/kitty.conf.bak
sudo nixos-rebuild switch
```

### services.logind 选项改名

**现象**：旧写法报 warning

**解决**：

```nix
# 旧写法
services.logind.lidSwitch = "suspend";

# 新写法
services.logind.settings.Login = {
  HandleLidSwitch = "suspend";
  HandleLidSwitchExternalPower = "ignore";
  HandleLidSwitchDocked = "ignore";
};
```

### Clash Verge Rev 日志

排错用：

```bash
tail -100 ~/.local/share/io.github.clash-verge-rev.clash-verge-rev/logs/latest.log
```

---

## 后记

从 Arch 迁过来折腾了将近一周，大部分坑都是「Niri 不是完整桌面环境」惹的祸——代理、输入法、电源管理在 KDE/GNOME 里开箱即用，在 Niri 下全得自己配。

但配好之后真的爽：整个系统状态写在配置文件里，重装一条命令搞定，再也不用花半天调环境了。NixOS 绝对值得投入时间学习。
