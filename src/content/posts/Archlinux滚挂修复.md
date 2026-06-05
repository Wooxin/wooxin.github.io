---
title: Arch Linux 滚挂修复指南
date: 2026-06-05 14:25:00
updated: 2026-06-05 14:35:00
category:
  - Linux
  - ArchLinux
tags:
  - Linux
  - ArchLinux
  - 教程
  - 修复
  - 滚动更新
---

> 滚 Arch 不挂几次，不算用过 Arch。挂了不可怕，不知道怎么修才可怕。

我之前的主力机就是 Arch(现在是Nix)，每周 `pacman -Syu`，两年来挂了不下五次。从最初慌得重装，到现在十分钟搞定。方法全写在这里。

## 挂了先别慌

挂了的症状通常就几种：

- 重启后进不了桌面（卡在 tty）
- 某个命令报 `segmentation fault`
- `pacman` 本身出了问题
- 内核更新后驱动挂了（NVIDIA 用户专属待遇）

第一步永远是：**先进系统再说**。

GRUB 启动菜单选 `Advanced options` → 找一个旧内核启动。Arch 默认保留最近两个内核，旧的通常能进系统。进去之后就是你的修复环境了。

如果连旧内核都进不去，U 盘启动 Arch ISO，挂载分区 chroot 进去：

```bash
mount /dev/sda2 /mnt          # 根分区
mount /dev/sda1 /mnt/boot     # EFI 分区
arch-chroot /mnt
```

## 场景一：部分升级导致库版本不一致

最常见的滚挂原因。你只升了某个包，它的依赖没跟上。或者你开了多个终端同时装东西。

```bash
# 血泪教训：永远用 -Syu，别用 -Sy
pacman -Syu              # 正确
pacman -Sy package       # 危险，容易导致部分升级
```

修法：

```bash
pacman -Syu              # 先尝试完整升级
```

如果 `pacman` 自己都挂了（`libcrypto.so` 找不到之类的）：

```bash
# 从缓存里找旧版 pacman 装回去
ls /var/cache/pacman/pkg/pacman-*
pacman -U /var/cache/pacman/pkg/pacman-6.x.x.pkg.tar.zst
```

如果缓存也没了，从 Arch Archive 下载：

```bash
curl -O https://archive.archlinux.org/packages/p/pacman/pacman-6.0.2-9-x86_64.pkg.tar.zst
pacman -U pacman-6.0.2-9-x86_64.pkg.tar.zst
```

## 场景二：内核更新后 NVIDIA 驱动废了

NVIDIA 用户专属。内核升了，nvidia 模块没跟上。

```bash
# 症状：进系统黑屏，或者 startx 报 no screens found
```

修复：

```bash
# 先进 tty（Ctrl+Alt+F2），然后
sudo pacman -Syu nvidia nvidia-utils nvidia-dkms linux-headers

# DKMS 版本更稳——每次内核更新自动重建模块
sudo pacman -S nvidia-dkms
```

如果是 `nvidia-open`（开源内核模块），换成闭源版：

```bash
sudo pacman -R nvidia-open
sudo pacman -S nvidia nvidia-utils
```

## 场景三：某个包冲突，pacman 不让更新

```bash
# 错误：XXX 和 YYY 有冲突
# pacman 直接报错退出
```

先看是哪个文件冲突：

```bash
pacman -Syuu             # 两个 -u 强制降级有冲突的包
```

还不行就手动解决：

```bash
# 找到冲突的文件属于哪个包
pacman -Qo /path/to/conflict

# 强制覆盖安装（慎用）
pacman -Syu --overwrite '/path/to/file'
```

## 场景四：GPG Key 过期

```bash
# 症状：安装时一堆 signature is unknown trust 错误
```

```bash
sudo pacman-key --refresh-keys
sudo pacman -S archlinux-keyring
```

如果 keyserver 被墙：

```bash
sudo pacman-key --keyserver hkp://keyserver.ubuntu.com --refresh-keys
```

## 场景五：显卡/显示器切换黑屏

换了显示器或者拔了外接屏之后进不了桌面。

```bash
# 删掉 Xorg 配置，让它重新生成
sudo rm /etc/X11/xorg.conf
sudo rm -rf /etc/X11/xorg.conf.d/*

# 或者直接跑 Xorg 自动配置
sudo Xorg -configure
```

Wayland 用户：

```bash
# 重置 GNOME/KDE 的显示配置
rm ~/.config/monitors.xml
```

## 场景六：文件系统只读

```bash
# 症状：touch 报错 Read-only file system
# 通常是磁盘出了问题，内核把文件系统挂成只读了
```

```bash
# 先看 dmesg
dmesg | tail -50

# 如果看到 I/O error，赶紧备份数据
# 然后 fsck 修
sudo fsck -y /dev/sda2
```

## 防滚挂的好习惯

1. **`pacman -Syu` 永远不要拆成 `-Sy` + 单独装**。`-Sy` 只更新数据库不更新包，等于把新数据库和老包混在一起，必出问题。

2. **大版本升级前看一眼 Arch 官网**。`linux` 包从 6.x 跳到 7.x 这种大更新，官网首页一定会写注意事项。

3. **装个 `downgrade` 工具**：

```bash
yay -S downgrade
downgrade linux          # 把内核滚回上个版本
```

4. **定期 `pacman -Sc` 清理缓存**，但留最近两个版本。这样出问题随时能降回去。

```bash
# 保留最近 3 个版本的缓存
paccache -rk 3
```

5. **NVIDIA 用户装 `nvidia-dkms` 而不是 `nvidia`**。DKMS 在内核更新时自动重新编译模块，少踩 80% 的坑。

6. **重要操作前拍个快照**。如果用 Btrfs，`pacman -Syu` 前 `snapper create -d "pre-update"`，挂了直接 `snapper rollback`。如果用 ext4，至少把 `/etc` 备份一下。

---

滚 Arch 的快乐和痛苦是同源的——你拿到的是最新的东西，意味着你要承担最新的 bug。但掌握了上面这些，大部分滚挂你都能在十分钟内修好，不用重装。

我滚了两年，真正束手无策只好重装的只有一次：自己手贱在 `/etc/pacman.conf` 里把 `HoldPkg` 去掉了，导致 `glibc` 被降级，整个系统 ABI 全乱。从那之后我学会一件事：如果你不是 100% 确定自己在干什么，别碰 `pacman.conf`。
