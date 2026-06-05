---
title: OnePlus 9 Pro 刷入 LineageOS 完整教程
date: 2026-06-05 00:00:00
category:
    - Android
    - 教程
tags:
    - OnePlus9Pro
    - LineageOS
    - 刷机
    - Android
    - 教程
---

> 官方氧 OS 停更之后，LineageOS 是这台老旗舰最好的归宿。本文以 OnePlus 9 Pro（lemonadep）为例，刷入 LineageOS 22。

## 前置准备

刷机会清除所有数据。先备份。

需要的文件：

- [LineageOS 22 for lemonadep](https://download.lineageos.org/devices/lemonadep)（选最新 nightly）
- [NikGApps](https://nikgapps.com)（选 arm64，Android 15，Core 版）
- [adb + fastboot 工具](https://developer.android.com/tools/releases/platform-tools)
- 原版氧 OS 13/14 底包（备着救砖）

## 第一步：解锁 Bootloader

打开开发者选项（设置 → 关于手机 → 连点版本号 7 次）。进开发者选项，打开 OEM 解锁和 USB 调试。

连电脑，确认授权：

```bash
adb devices
# 应显示 device
```

进 fastboot：

```bash
adb reboot bootloader
```

解锁：

```bash
fastboot oem unlock
```

手机会震动，屏幕提示确认解锁。音量键选 UNLOCK，电源键确认。**手机会自动清除所有数据并重启**。

重启后重新进开发者选项，确认 OEM 解锁还是开的。很多 ROM 在 OEM 锁了的情况下会变砖。

## 第二步：刷入 Lineage Recovery

从 LineageOS 下载页拿到 `recovery.img`：

```bash
adb reboot bootloader
fastboot flash recovery recovery.img
fastboot reboot recovery
```

进去就是 Lineage Recovery 的界面。

## 第三步：线刷 LineageOS

在 Recovery 里选 Factory reset → Format data/factory reset。这是必须的——从氧 OS 切到 LineageOS 必须清 data。

然后进 Apply update → Apply from ADB：

```bash
adb sideload lineage-22.0-xxxx-nightly-lemonadep-signed.zip
```

进度条跑到 47% 的时候会报 `Error applying update`，不要慌。这是 A/B 分区的正常行为——实际已经刷进去了，Recovery 只是多打了一步校验。直接点 Reboot system now。

如果你想加 Magisk，刷完 ROM 后不要重启，先 sideload Magisk APK（把 `.apk` 改后缀为 `.zip` 再 sideload）。

## 第四步：刷 GApps

重启进系统后，Google 全家桶是没的。要刷进 recovery 再 sideload：

```bash
adb reboot recovery
```

Recovery 里面选 Apply update → Apply from ADB：

```bash
adb sideload NikGapps-core-arm64-15-xxxx-signed.zip
```

为什么选 Core 而不是 Full？Core 只有 Play Store 和基础框架，其余 App 自己去 Play Store 下。Full 包太大，A/B 分区剩余空间可能不够，sideload 会失败。

## 第五步：初始设置

刷完 GApps 重启，正常走 Google 设置向导。进系统后第一步：打开开发者选项，把动画缩放调到 0.5x。不是玄学，OnePlus 9 Pro 的 120Hz 屏幕在 LineageOS 上默认动画有点拖。

## 常见坑

### Widevine 降级到 L3

解锁 Bootloader 之后 Netflix/Prime Video 最高只能看 480p。一加 9 Pro 没有绕过方案——解锁就会熔断 TEE 密钥。如果你离不开高清流媒体，刷机前考虑清楚。

### 相机退步

LineageOS 用的是 AOSP 相机 HAL，没有一加/Hasselblad 的调教。照片噪点比氧 OS 多，夜景模式基本不能用。装 GCam（Google Camera）有点改善，勉强够用。

AGC Toolkit 8.8 + 合适的 config 文件，白天拍照能接近原厂 80% 水平。Bilibili 搜 「lemonadep GCam config」，按日期排序找最新的。

### 快充掉速

LineageOS 只能触发 PD 18W，一加的 Warp Charge 65W 私协无法工作。用原装充电头也只是 18W。这个无解——Warp Charge 的协议是闭源的，LineageOS 搞不定。

### SafetyNet / Play Integrity

不用 Magisk 的话，Google Pay、银行类 App 大概率打不开。Magisk + Play Integrity Fix 模块可以过 Basic 和 Device 认证，Strong 认证别想了（解锁 Bootloader 直接判死刑）。

刷 Magisk 后装模块顺序：
1. Play Integrity Fix
2. Zygisk Assistant
3. Shamiko（如果需要隐藏 root）

重启后 `Play Integrity API Checker` 验证，只要过 Device 级别就行。

## 每天使用体验

刷了 LineageOS 的 OnePlus 9 Pro 基本就是一台无广告、流畅、能一直更新 Android 版本的干净手机。缺点也明确：相机打折、快充打折、Widevine 打折。但换来的是没有任何预装垃圾、没有系统广告、没有强制更新的体验。

搞机的乐趣就在这儿：你花时间折腾，换来一台真正属于你的手机。不是厂商塞给你的那种，是你自己选的。

刷完 LineageOS 如果还是不满意，下一篇我会写如何直接强刷 ColorOS 16。
