---
title: 使用 BusyBox 构建最小 ISO
date: 2026-06-05 11:42:32
category:
  - Linux
tags:
  - Linux
  - 安装
  - 部署
  - 系统
  - BusyBox
  - 编译
---

> 自己做一张能启动的 Live ISO，总共不到 20MB。不用 systemd、不用 glibc、不用任何发行版的东西。纯手工，从头撸。

## 为什么做这个

BusyBox 把几百个常用的 Linux 命令打包进一个二进制文件，大小不到 2MB。拿 BusyBox + Linux 内核，就能做一个极度精简的 Linux 系统。没有 systemd，没有 dbus，没有 NetworkManager——所有东西都你自己决定要不要。

我之前做 initramfs 版本的 mini Linux 跑得很好，但每次都要从 GRUB 引导。做成 ISO 之后，U 盘一插就能给任何机器跑，拿来当救援盘或者裸机调试环境都很爽。

## 环境准备

随便一台 Linux 机器或者虚拟机。我用的是 Arch，其他发行版依赖名自己映射。

```bash
# 创建工作目录
mkdir -p ~/busyiso/{rootfs,iso,src}
cd ~/busyiso

# 安装编译依赖
sudo pacman -S --needed base-devel bc cpio syslinux xorriso wget
```

## 编译内核

先编译一个最精简的内核。不需要模块支持，所有必需的驱动全编译进内核。

```bash
cd ~/busyiso/src
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.6.tar.xz
tar -xf linux-6.6.tar.xz
cd linux-6.6

# 用默认配置打底
make defconfig
```

然后手动裁减。你当然可以在 `menuconfig` 里一项一项点，但我把关键配置列出来：

```bash
# 64位内核
CONFIG_64BIT=y

# 必须编译进内核的（不是模块）
CONFIG_DEVTMPFS=y
CONFIG_DEVTMPFS_MOUNT=y
CONFIG_BLK_DEV_INITRD=y

# 文件系统支持
CONFIG_EXT4_FS=y
CONFIG_EXT4_USE_FOR_EXT2=y
CONFIG_ISO9660_FS=y
CONFIG_OVERLAY_FS=y
CONFIG_TMPFS=y
CONFIG_PROC_FS=y
CONFIG_SYSFS=y

# SATA / SCSI 控制器
CONFIG_ATA=y
CONFIG_ATA_SFF=y
CONFIG_SATA_AHCI=y
CONFIG_BLK_DEV_SD=y

# 网络
CONFIG_NET=y
CONFIG_INET=y
CONFIG_PACKET=y

# 全部裁掉不需要的
# CONFIG_MODULES is not set
# CONFIG_SOUND is not set
# CONFIG_DRM is not set
```

一刀切的办法：把 `.config` 里所有 `=m` 的行全删了，因为我们不要模块。

```bash
sed -i '/=m$/d' .config
make olddefconfig
make -j$(nproc)
```

编译完内核在 `arch/x86/boot/bzImage`，待会用到。

## 编译 BusyBox

```bash
cd ~/busyiso/src
wget https://busybox.net/downloads/busybox-1.36.1.tar.bz2
tar -xf busybox-1.36.1.tar.bz2
cd busybox-1.36.1

# 静态编译——这个很关键，避免 musl/glibc 依赖问题
make defconfig
sed -i 's/# CONFIG_STATIC is not set/CONFIG_STATIC=y/' .config
sed -i 's/CONFIG_FEATURE_SYSTEMD=y/# CONFIG_FEATURE_SYSTEMD is not set/' .config
make olddefconfig
make -j$(nproc)
make CONFIG_PREFIX=~/busyiso/rootfs install
```

`CONFIG_PREFIX` 直接把 BusyBox 装到 rootfs 目录。

## 构建根文件系统

```bash
cd ~/busyiso/rootfs

# 创建标准目录结构
mkdir -p {dev,proc,sys,etc,run,tmp,root,mnt,var/log}

# 设备节点
sudo mknod dev/console c 5 1
sudo mknod dev/null c 1 3
sudo mknod dev/tty c 5 0
sudo mknod dev/tty0 c 4 0
sudo mknod dev/random c 1 8
sudo mknod dev/urandom c 1 9

# 将 BusyBox 创建的链接修正一下（BusyBox 默认装在 /usr 下可能需要调整）
# BusyBox 的 make install 已经把东西放在 rootfs 了
```

### init 脚本

这是系统启动后第一个用户态进程。没有 systemd，`/init` 就是一切。

```bash
cat > init << 'EOF'
#!/bin/sh

# 挂载伪文件系统
mount -t proc proc /proc
mount -t sysfs sysfs /sys
mount -t devtmpfs devtmpfs /dev
mount -t tmpfs tmpfs /tmp
mount -t tmpfs tmpfs /run

# 欢迎信息
clear
echo "=================================="
echo "  BusyBox Minimal Live ISO"
echo "  Kernel: $(uname -r)"
echo "  Arch: $(uname -m)"
echo "=================================="
echo

# 直接启动 shell
exec /bin/sh
EOF

chmod +x init
```

### 用户和组

```bash
cat > etc/passwd << EOF
root:x:0:0:root:/root:/bin/sh
EOF

cat > etc/group << EOF
root:x:0:
EOF

cat > etc/inittab << EOF
::sysinit:/etc/init.d/rcS
::respawn:-/bin/sh
tty2::askfirst:-/bin/sh
::ctrlaltdel:/bin/umount -a -r
EOF
```

## 打包 ISO

用 isolinux 做引导器。copy 一下必需的引导文件：

```bash
mkdir -p ~/busyiso/iso/isolinux
cp ~/busyiso/src/linux-6.6/arch/x86/boot/bzImage ~/busyiso/iso/

# 复制 isolinux 引导文件
cp /usr/lib/syslinux/bios/isolinux.bin ~/busyiso/iso/isolinux/
cp /usr/lib/syslinux/bios/ldlinux.c32 ~/busyiso/iso/isolinux/

# 创建 isolinux 配置
cat > ~/busyiso/iso/isolinux/isolinux.cfg << 'EOF'
DEFAULT linux
LABEL linux
  KERNEL /bzImage
  APPEND initrd=/rootfs.cpio.gz root=/dev/ram0 console=ttyS0 console=tty0
EOF
```

把 rootfs 打包成 initramfs：

```bash
cd ~/busyiso/rootfs
find . | cpio -o -H newc | gzip > ~/busyiso/iso/rootfs.cpio.gz
```

最后用 xorriso 生成 ISO：

```bash
xorriso -as mkisofs \
  -o ~/busyiso/minimal-linux.iso \
  -b isolinux/isolinux.bin \
  -c isolinux/boot.cat \
  -no-emul-boot \
  -boot-load-size 4 \
  -boot-info-table \
  ~/busyiso/iso
```

生成的 ISO 大概 15~20MB。

## 测试

```bash
qemu-system-x86_64 -cdrom ~/busyiso/minimal-linux.iso -m 512M -nographic
```

`-nographic` 走串口输出，不需要图形界面。看到 BusyBox 的欢迎信息然后掉进 shell，就成了。

```bash
# 在 VM 里验证
uname -a
ls /
free
df -h
```

如果你要图形输出（帧缓冲）：

```bash
qemu-system-x86_64 -cdrom ~/busyiso/minimal-linux.iso -m 512M
```

## 加网络支持

上面做的是最简版，没网络。要加网络也简单：

重新编译 BusyBox，打开网络相关的 applet：

```bash
make menuconfig
# Networking Utilities → 勾选 ifconfig, ping, wget, telnet, nc
# Linux System Utilities → 勾选 dhcpc
make -j$(nproc)
make CONFIG_PREFIX=~/busyiso/rootfs install
```

重新打包 rootfs + ISO。

进系统后手动拿 IP：

```bash
ifconfig eth0 up
udhcpc -i eth0
ping 8.8.8.8
```

## 加持久化存储

Live ISO 每次重启都会丢数据。如果你想让修改保留，需要做 overlay：

```bash
# 启动后找个有剩余空间的分区
mkdir /mnt/persist
mount /dev/sda1 /mnt/persist

# 创建 overlay
mkdir -p /mnt/persist/{upper,work}
mount -t overlay overlay -o lowerdir=/,upperdir=/mnt/persist/upper,workdir=/mnt/persist/work /mnt/overlay

# 切到 overlay 的根
exec chroot /mnt/overlay /bin/sh
```

但这不太优雅。更好的做法是直接在 init 脚本里判断有没有持久分区，有就 overlay 上去。

## 常见坑

1. **启动后 kernel panic** — 大概率是 init 脚本没写好。内核找不到 `init` 就 panic。确保 `chmod +x init`。

2. **`/dev` 下面全是空的** — 没挂 `devtmpfs`。在 init 脚本里加 `mount -t devtmpfs devtmpfs /dev`。

3. **BusyBox 提示 `applet not found`** — 某个命令在编译 BusyBox 时没勾上。重新 `make menuconfig` 勾上再编译。

4. **静态链接失败** — 某些发行版默认不装静态 glibc 库。Arch 用 glibc 没问题，Ubuntu 需要 `apt install libc6-dev-static`。

5. **ISO 启动后找不到 rootfs** — `isolinux.cfg` 里的 `initrd=` 路径写错了。确认 rootfs.cpio.gz 在 ISO 根目录。

## 扩展方向

这个最简版本只是个起点。往上能加的东西：

- **包管理**: 交叉编译 apk-tools（Alpine 的包管理器），或者自己写个简单的
- **SSH**: 交叉编译 dropbear，几百 KB 的 SSH 服务端
- **GCC 工具链**: 交叉编译 binutils + gcc，做成一张能编译自己的 Live ISO
- **完整桌面**: 交叉编译 Weston（Wayland compositor）+ 一个终端模拟器

这个最简 ISO 我放在 U 盘里当救援盘用了小半年。服务器挂了进不去系统的时候，插上它至少能挂载磁盘、看日志、修引导、备份数据。20MB 的东西比任何 Live USB 都快。

每次内核或 BusyBox 出大版本我都会重新编译一张，流程全自动化了就几个命令的事。
