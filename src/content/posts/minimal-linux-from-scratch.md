---
title: 从零开始构建最小化Linux系统
date: 2026-06-04
category:
  - Linux
tags:
  - Linux
  - 教程
  - 内核
  - 编译
  - 系统
---

> 这篇教程会带你从零构建一个能跑起来的最小化 Linux，不依赖任何发行版包管理器，所有东西手动编译。

## 环境准备

随便开一台 Linux 虚拟机或者物理机，我用的是 ArchLinux，其他发行版步骤基本一致。

```bash
# 创建工作目录
mkdir -p ~/minilinux/{rootfs,kernel,src}
cd ~/minilinux

# 安装编译依赖 (Arch)
sudo pacman -S --needed base-devel wget bc cpio ncurses

# Debian/Ubuntu 用这个
# sudo apt install build-essential wget bc cpio libncurses-dev flex bison
```

## 第一阶段：编译内核

内核是整个系统的核心，先搞定它。不需要花里胡哨的模块，直接最小化配置。

```bash
cd ~/minilinux/src

# 下载最新稳定内核，自己去 kernel.org 看版本号
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.12.tar.xz
tar -xf linux-6.12.tar.xz
cd linux-6.12

# 最小化配置
make defconfig

# 精简一下
scripts/config --disable MODULES          # 不需要模块
scripts/config --disable WIRELESS         # 不要无线
scripts/config --disable DRM              # 不要显卡驱动
scripts/config --disable SOUND            # 不要声卡
scripts/config --disable USB_SUPPORT      # 不需要的话关了

# Arch 用户关掉内核签名，不然编不过
scripts/config --disable SYSTEM_TRUSTED_KEYS
scripts/config --disable SYSTEM_REVOCATION_KEYS
scripts/config --disable DEBUG_INFO_BTF

# 开编
make -j$(nproc)
```

编完把内核镜像拷出来：

```bash
cp arch/x86/boot/bzImage ~/minilinux/kernel/
```

如果用 ARM 板子，路径是 `arch/arm/boot/zImage`。

## 第二阶段：编译 BusyBox

GNU 工具链太大了，用 BusyBox 一个二进制搞定所有基础命令。

```bash
cd ~/minilinux/src

wget https://busybox.net/downloads/busybox-1.37.0.tar.bz2
tar -xf busybox-1.37.0.tar.bz2
cd busybox-1.37.0

make defconfig

# 开启静态编译，避免运行时找动态库
sed -i 's/# CONFIG_STATIC is not set/CONFIG_STATIC=y/' .config

# Arch 用户会遇到 ncurses 报错，改一下检测脚本
sed -i 's/main() {/int main() {/' scripts/kconfig/lxdialog/check-lxdialog.sh

make -j$(nproc)
make install CONFIG_PREFIX=~/minilinux/rootfs
```

`CONFIG_STATIC=y` 是关键，静态编译出来的 busybox 不依赖任何 `.so` 文件，省去后面配库的痛苦。

## 第三阶段：构建根文件系统

```bash
cd ~/minilinux/rootfs

# 必要目录
mkdir -p {bin,sbin,etc/init.d,dev,proc,sys,tmp,var,root,lib,usr/bin,usr/sbin}

# 设备节点
sudo mknod -m 600 dev/console c 5 1
sudo mknod -m 666 dev/null c 1 3
sudo mknod -m 666 dev/zero c 1 5
sudo mknod -m 666 dev/tty c 5 0

# init 脚本
cat > etc/init.d/rcS << 'EOF'
#!/bin/sh

mount -t proc none /proc
mount -t sysfs none /sys
mount -t devtmpfs none /dev
mount -t tmpfs none /tmp

echo "minilinux started."

# 开个 shell
setsid cttyhack sh
EOF

chmod +x etc/init.d/rcS

# BusyBox 的 init 需要这个
ln -s /etc/init.d/rcS etc/init.d/rcK

# inittab
cat > etc/inittab << 'EOF'
::sysinit:/etc/init.d/rcS
::respawn:-/bin/sh
::ctrlaltdel:/sbin/reboot
::shutdown:/etc/init.d/rcK
EOF

# fstab
cat > etc/fstab << 'EOF'
proc  /proc proc  defaults 0 0
sysfs /sys  sysfs defaults 0 0
tmpfs /tmp  tmpfs defaults 0 0
EOF

# hostname
echo 'minilinux' > etc/hostname

# passwd (root 无密码)
echo 'root::0:0:root:/root:/bin/sh' > etc/passwd
echo 'root:x:0:' > etc/group
```

到这里 rootfs 就算搭好了，结构大概是这样：

```bash
# tree -L 2 ~/minilinux/rootfs
├── bin -> usr/bin
├── dev
│   ├── console
│   ├── null
│   ├── tty
│   └── zero
├── etc
│   ├── fstab
│   ├── hostname
│   ├── init.d
│   ├── inittab
│   ├── passwd
│   └── group
├── proc
├── root
├── sbin
├── sys
├── tmp
└── usr
    ├── bin
    └── sbin
```

## 第四阶段：打包 & 启动测试

### 方式一：打包成 initramfs（推荐，拿来即用）

```bash
cd ~/minilinux/rootfs
find . | cpio -o -H newc | gzip > ~/minilinux/initramfs.cpio.gz
```

### 方式二：做成磁盘镜像

```bash
cd ~/minilinux

# 64M 镜像
dd if=/dev/zero of=rootfs.img bs=1M count=64
mkfs.ext4 rootfs.img

mkdir /tmp/mnt
sudo mount rootfs.img /tmp/mnt
sudo cp -a rootfs/* /tmp/mnt/
sudo umount /tmp/mnt
```

### 方式三：直接搓 ISO

```bash
sudo pacman -S grub libisoburn xorriso  # Arch
mkdir -p iso/boot/grub

cp kernel/bzImage iso/boot/
cp rootfs.img iso/boot/

cat > iso/boot/grub/grub.cfg << 'EOF'
set timeout=5
menuentry "minilinux" {
    linux /boot/bzImage root=/dev/sda1 ro quiet
    initrd /boot/rootfs.img
}
EOF

grub-mkrescue -o minilinux.iso iso/
```

## 启动测试

用 QEMU 快速测试，不需要重启机器：

```bash
# 用 initramfs 启动
qemu-system-x86_64 \
    -kernel ~/minilinux/kernel/bzImage \
    -initrd ~/minilinux/initramfs.cpio.gz \
    -nographic \
    -append "console=ttyS0"

# 或者用磁盘镜像
qemu-system-x86_64 \
    -kernel ~/minilinux/kernel/bzImage \
    -drive file=~/minilinux/rootfs.img,format=raw \
    -nographic \
    -append "root=/dev/sda rw console=ttyS0"
```

看到 shell 提示符就说明成功了。

## 后续扩展

到这一步你有了一个能跑的最小化 Linux，但还很简陋。可以继续搞这些：

- **网络**：编译内核时把网络驱动编进去，配个 `udhcpc` 就能上网
- **OpenSSH**：把 dropbear 或者 openssh 塞进去
- **包管理**：移植 opkg 或者自己搓个简单的
- **GPU**：有需要的话把显卡驱动编入内核而不是模块
- **systemd**：如果你时间多可以试试，但我劝你别

整个系统不到 50M（压缩后），启动秒进，适合嵌入式或者当容器 base image 用。

---

> 有什么问题可以在评论区问，我看到会回。
