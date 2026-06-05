---
title: ArchLinux速通Wayland - 第一章
date: 2025-09-14 00:00:00
category:
    - Linux
    - ArchLinux
tags:
    - Linux
    - 安装
    - 部署
    - ArchLinux
    - 系统
---
本教程将用最简单的方式教小白入ArchLinux
- 使用Archinstall是速通ArchLinux的最好方法(做软raid别用)
- 个人认为wayland是最舒服的桌面, 而且配置简单, 强烈推荐

## 事前准备
选择Arch Linux install medium进入live
更新本地库
```bash
pacman -Sy
```
若下载速度变慢可以直接CTRL+C中断然后再次更新, 这时候速度就快了
下载archinstall, 下一期出一个不用archinstall的, 不过archinstall更好用
```bash
pacman -S archinstall
```

## 安装部署
输入archinstall进入install界面
1. Archinstall language默认英文不改, 也可以选择喜欢的语言(无中文)
2. Locales 先不用修改, 之后再改也一样
3. Mirrors and repositories  镜像存储库
	1. Select regions 等待列表出现, 键入/搜索china回车确定选择
	2. 进入Optional repositories 选中multilib并按空格选中, 回车确定 
4. Disk configuration 选择Partitioning
	1. 若无其他需求选择Use a best-effort default partition layout, 键入空格选择需要的硬盘并回车确定 
	2. 按照个人需求选择格式化, 建议选择xfs或者f2fs
5. Swap不用关, 默认是开的
6. Bootloader也是根据个人喜好选择, 个人比较喜欢Limine, 选择grub也可以, 都行
7. Hostname, 输入你的主机名
8. Authentication
	1. Root password Root用户的密码, 建议设置为自己能记住且复杂的, 否则会有好玩的事情发生
	2. User account 这里我们创建一个用户, 这个用户是常用
9. Profile 选择type并选择Minimal
10. Applications
	1. Bluetooth打开
	2. Audio按照自己喜好选择, 我这里选择了pipewire 因为用起来更舒服
11. Kernels 请谨慎选择, 建议默认或者zen, 这会对你稍后安装显卡驱动造成影响
12. Network configuration选择networkmanager, 其实选哪个都行
13. Additional packages, 选择你要加的库
14. Timezone键入/搜索shanghai并选定
Install
安装完成后选择Reboot system重启

怎么样, archinstall是不是很简单, 连下载到安装用不了几分钟
