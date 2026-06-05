---
title: WSL部署及问题解决
date: 2026-01-01 00:00:00
updated: 2026-01-01
category:
  - Linux
  - Windows
tags:
  - Linux
  - 安装
  - 部署
  - wsl
  - windows
published: true
---

## 安装WSL

### 启用适用于Windows的linux子系统

```shell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
```

### 启用虚拟机平台

```shell
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

### 默认使用wsl2

```shell
wsl --set-default-version 2

# 查看wsl版本信息
wsl --version
```

### WSL2更新内核

```shell
wsl --update
```

### 搜索线上可用系统

```shell
wsl --list --online
```

### 安装自己需要的子系统

```shell
wsl --install -d <Distro>
```
