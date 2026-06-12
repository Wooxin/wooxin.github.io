---
title: Nix踩坑记录
date: 2026-06-12 16:18:16
category:
  - Linux
  - NixOS
tags:
  - Linux
  - NixOS
  - Nix
  - 踩坑
  - Flakes
  - 疑难杂症
description: 从安装到日常使用，NixOS 上踩过的十四个坑——有些坑踩半天才爬出来，有些至今没爬出来。
---

写这篇纯粹是因为被 NixOS 折磨太多次了。你说它好吧，声明式配置、可复现构建、随时回滚，确实香。你说它折磨吧，一个错误信息能让你研究半天，还经常是那种"就差一个分号"级别的破事。

> 我现在的主力办公机就是 NixOS + Windows 双系统。顺便提一嘴：之前那篇《NixOS 新手教程》是一本正经教你怎么用，这篇是教你遇到坑了怎么办。两篇配合食用最佳。

---

## 一、Flakes 和传统模式，你总得选一个

这是 NixOS 新用户碰到的第一个分岔路口。

NixOS 有两套生态：

| 传统模式 | Flakes |
|---|---|
| `nix-channel` 管理软件源 | `flake.lock` 锁定依赖 |
| `nix-env -i` 装包 | 不推荐 `nix-env` |
| 配置写在 `/etc/nixos/configuration.nix` | 同样的 `configuration.nix`，但外层包了一个 `flake.nix` |
| 不稳定，不同机器可能装出不一样的东西 | 可复现，同一份 lock 文件到处一致 |

两套东西的命令不一样，语法也不一样。社区现在一边倒推荐 Flakes，但官方文档还是以传统模式为主。你搜一个问题，搜出来的答案一半是 Flakes 写法一半是传统写法——刚接触根本分不清哪个是自己要的。

**坑点**：在 Flakes 模式下忘记加 `--flake` 参数，系统照常重建，但用的是旧 channel 而不是你的 `flake.lock`。

```bash
# 正确
sudo nixos-rebuild switch --flake /etc/nixos#myhost

# 错误——不会报错，但用的不是你预期的版本
sudo nixos-rebuild switch
```

> 建议：一开始就上 Flakes。传统模式学到一半再切 Flakes 更折腾。

---

## 二、nix-channel --update 滚挂了

传统模式下的 `nix-channel --update` 类似于 Arch 的 `pacman -Syu`。如果你追的是 `nixos-unstable`，更新完之后某些包可能不兼容，`nixos-rebuild switch` 直接报错。

```bash
sudo nix-channel --add https://nixos.org/channels/nixos-unstable nixos
sudo nix-channel --update
sudo nixos-rebuild switch
# error: 某个 derivation 构建失败
```

**怎么办**：两种方案：

1. **切回稳定版**：
```bash
sudo nix-channel --add https://nixos.org/channels/nixos-24.11 nixos
sudo nix-channel --update
sudo nixos-rebuild switch
```

2. **用 Flakes + Git 管理配置**，把 `flake.lock` 提交到 Git。滚挂了直接 `git checkout` 回到上一次能用的版本。

> Arch 用户转 NixOS 的经典错觉：以为 `nix-channel --update` 和 `pacman -Syu` 一样随时可以滚。错。NixOS 的 unstable 是真的 unstable，有时候连桌面都进不去。

---

## 三、`allowUnfree = true` 忘加了

```bash
$ nixos-rebuild switch
error: Package ‘steam’ in ... has an unfree license, refusing to evaluate.
```

提示很清楚，但每个新用户都会撞一次。NixOS 默认不允许安装非自由软件——包括 NVIDIA 驱动、Steam、VSCode、Chrome、Slack 等等。

**修复**：在 `configuration.nix` 里加一行：

```nix
nixpkgs.config.allowUnfree = true;
```

Flakes 模式下要写在 module 的参数里：

```nix
{ pkgs, ... }: {
  nixpkgs.config.allowUnfree = true;
}
```

> 血的教训：装系统第一时间就把这行写上，省得每次装新包都报错。

---

## 四、/nix/store 把磁盘吃满了

`/nix/store` 是 NixOS 存放所有包和 derivations 的地方。每次 `nixos-rebuild switch` 都会创建新的 generation，旧的不会自动删。

用了几个月，`/nix/store` 轻松上百 GB。特别是你如果频繁重建或者用过 `nix-shell -p` 试包，那些临时依赖也都堆在里面。

**清理**：

```bash
# 删除超过 7 天的旧 generation
sudo nix-collect-garbage --delete-older-than 7d

# 删除所有未被当前 generation 引用的包（更激进）
sudo nix-collect-garbage -d

# 查看各 generation 大小
nixos-rebuild list-generations
```

**自动清理**：在 `configuration.nix` 里加：

```nix
nix.gc = {
  automatic = true;
  dates = "weekly";
  options = "--delete-older-than 7d";
};
```

> 坑点：`nix-collect-garbage -d` 会把你 `nix-shell -p` 试过的那些包的缓存也删了。下次再用又要重新下载。

---

## 五、Nix 语言的错误信息像天书

```nix
error: infinite recursion encountered

       at /etc/nixos/configuration.nix:42:5:

           41|   services.openssh = {
           42|     enable = true;
             |     ^
           43|   };
```

你写了 `services.openssh.enable = true`，但 Nix 告诉你这不对——因为 `services.openssh` 本身就是一个 set，应该直接写 `services.openssh.enable = true` 不能嵌套。

说得清楚吗？对老手来说够清楚。对新手来说："什么叫 infinite recursion？我哪里递归了？"

**常见 Nix 语言错误和真实含义**：

| 错误信息 | 实际意思 |
|---|---|
| `infinite recursion` | 赋值结构写错了，大概率是嵌套层级不对 |
| `attribute ... missing` | 引用了不存在的配置项，拼写错误或该选项不存在 |
| `value is ... while a set was expected` | 少了花括号或多了花括号 |
| `a list was expected` | 忘了 `with pkgs; [` 或者少写了括号 |
| `hash mismatch in fixed-output derivation` | Flakes lock 文件和实际下载的不一致 |

**怎么办**：
- 先查 [search.nixos.org/options](https://search.nixos.org/options) 确认选项名是对的
- 拿不准就去 GitHub 搜别人的 `configuration.nix` 参考
- 错误提示里的行号大多数时候是准的，从那里开始排查

---

## 六、输入法（fcitx5）配了半天不生效

在 NixOS 上配 fcitx5 和在 Arch 上不一样——不是装个包设个环境变量就行。有额外的模块要开。

```nix
# 正确的配置
i18n.inputMethod = {
  enabled = "fcitx5";
  fcitx5.addons = with pkgs; [
    fcitx5-chinese-addons
    fcitx5-gtk
  ];
};
```

然后重建：

```bash
sudo nixos-rebuild switch
```

**坑点**：

1. **不要用 `environment.variables` 设 `GTK_IM_MODULE`、`QT_IM_MODULE`**。NixOS 的 `i18n.inputMethod` 模块会自动设好这些。

2. **Flakes 模式下 `fcitx5-chinese-addons` 的包名可能变**。如果报 `attribute ... missing`，去 [search.nixos.org](https://search.nixos.org) 搜一下当前 channel 的确切包名。

3. **Wayland 下 fcitx5 要多加一行**：
```nix
environment.sessionVariables = {
  XMODIFIERS = "@im=fcitx";
};
```

4. 重建完**必须重启**（或至少重新登录），环境变量才会生效。光 `nixos-rebuild switch` 不够。

---

## 七、Home Manager 到底是干嘛的

装了 NixOS 之后你很快会听到 "Home Manager"。然后你会问：我已经有 `configuration.nix` 了，为什么还要一个 Home Manager？

**简单说**：`configuration.nix` 管系统级别的配置（需要 sudo），Home Manager 管用户级别的配置（不需要 sudo）。

| `configuration.nix` | Home Manager |
|---|---|
| 系统服务、内核参数、全局软件包 | 用户级软件包、dotfiles、GTK 主题 |
| `sudo nixos-rebuild switch` | `home-manager switch` |
| 影响所有用户 | 只影响当前用户 |
| 必须 root | 普通用户即可 |

**坑点**：Home Manager 的配置语法和 `configuration.nix` 有微妙差异。比如同样的 `programs.git.enable = true`，在系统配置里和 Home Manager 里可能字段名不一样。

**建议**：新手先别碰 Home Manager，把 `configuration.nix` 玩熟了再说。等你需要管理 dotfiles 或者想在不同的 NixOS 机器之间同步用户配置时，再学 Home Manager。

---

## 八、双系统 GRUB 不显示 Windows

装好 NixOS 之后重启，GRUB 菜单里只有 NixOS。Windows 分区明明在硬盘上。

**原因**：`nixos-generate-config` 只会探测根分区和 EFI 分区，不会自动添加 Windows 启动项。而且 NixOS 默认配置里 `boot.loader.grub` 没有开 `os-prober`。

**修复**：在 `configuration.nix` 里加：

```nix
boot.loader.grub = {
  enable = true;
  device = "nodev";       # EFI 系统用 nodev
  efiSupport = true;
  useOSProber = true;     # ← 这一行
};
```

重建：

```bash
sudo nixos-rebuild switch
```

GRUB 会自动检测到 `/boot` 下的 Windows EFI 文件并添加启动项。

> 坑点：如果 Windows 和 NixOS 不在同一块硬盘上，`os-prober` 可能还是检测不到。要手动把 Windows 的 EFI 分区挂载到 `/boot/efi_windows` 之类的地方。

---

## 九、安装时连不上 WiFi

NixOS 的安装 ISO 非常精简，不含闭源固件。如果你的无线网卡是 Broadcom 或者某些 Realtek 型号，启动后 `ip a` 看不到 `wlan0`。

**解决方案**：

1. **插网线安装**（最省事）
2. **用包含了固件的非官方 ISO**
3. **USB 网络共享**：手机连 WiFi，USB 线插电脑，开 USB 网络共享，NixOS 会自动识别为 `usb0` 网卡：
   ```bash
   dhclient usb0
   ```

> 这个问题不是 NixOS 独有的，Debian 的 netinst ISO 也一样。只是 NixOS 需要联网下载的东西更多，所以显得更致命。

---

## 十、`nix-shell` vs `nix develop` 的区别

```bash
nix-shell -p python3          # 传统模式
nix develop                   # Flakes 模式
```

两个命令干的事情差不多：创建一个临时环境。但：

| `nix-shell` | `nix develop` |
|---|---|
| 传统模式 | Flakes 模式 |
| 需要 `.nix` 文件 | 需要 `flake.nix` |
| 退出后环境完全消失 | 同上 |
| 用 `--pure` 排除系统环境 | Flakes 默认隔离 |

**坑点**：在 Flakes 项目里用 `nix-shell` 不会读取 `flake.nix`，所以装的包可能和你预期的不一样。Flakes 项目一律用 `nix develop`。

---

## 十一、`pip install` 和 `npm install -g` 不能用

在 NixOS 上直接 `pip install --user`：

```bash
$ pip install requests
error: externally-managed-environment
```

NixOS 不允许你在系统层面用传统的包管理器装东西。解决方案：

**Python**：
```nix
environment.systemPackages = with pkgs; [
  (python3.withPackages (ps: with ps; [
    numpy
    pandas
    requests
  ]))
];
```

或者临时用：

```bash
nix-shell -p "python3.withPackages (ps: with ps; [ requests ])"
```

**Node.js**：
```nix
environment.systemPackages = with pkgs; [
  nodePackages.pnpm     # 全局工具可以装
  nodejs
];
# 项目依赖还是用 npm/pnpm/yarn，它们在项目目录下工作不受 Nix 限制
```

> Node 的 `npm install`（不加 `-g`）在项目目录下正常工作，因为它是写到 `node_modules/` 而不是系统目录。

---

## 十二、国内下载慢

NixOS 默认从 `cache.nixos.org` 拉包，国内速度感人。一个 GNOME 桌面能下载半小时。

**换国内镜像**（TUNA）：

```nix
# 在 configuration.nix 里加
nix.settings.substituters = [
  "https://mirrors.tuna.tsinghua.edu.cn/nix-channels/store"
  "https://cache.nixos.org"
];
nix.settings.trusted-public-keys = [
  "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
];
```

**Flakes 模式下**，`flake.nix` 引用的 GitHub 源（比如 `nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable"`）走的是 GitHub，不受缓存设置影响。如果你在境内，`nix flake update` 可能会很慢甚至超时。

**解决方案**：把 GitHub 源换成 TUNA 镜像：

```nix
inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
# 改成
inputs.nixpkgs.url = "https://mirrors.tuna.tsinghua.edu.cn/nix-channels/nixpkgs-unstable/nixexprs.tar.xz";
```

> 我个人没换镜像，因为科学上网的环境下 GitHub 反而比清华源快。但这个坑值得写出来，因为国内不用代理的 NixOS 用户基本都会撞上。

---

## 十三、Steam 跑不起来

```bash
$ steam
libGL error: failed to load driver
```

Steam 是 32 位程序，需要 32 位的 OpenGL 库和 GPU 驱动。NixOS 默认只装 64 位的。

**修复**：

```nix
# 启用 Steam（会自动处理 32 位依赖）
programs.steam.enable = true;

# 如果你用 NVIDIA
hardware.opengl.driSupport32Bit = true;

# 如果你用 AMD/Intel
hardware.opengl = {
  enable = true;
  driSupport32Bit = true;
};
```

> 坑点：`programs.steam.enable` 会自动拉一大堆 32 位库，第一次重建会很慢。等就行了。

---

## 十四、回滚之后发现"之前能用的配置现在不行了"

你开开心心滚回了一个月前能用的 generation，结果发现那个 generation 引用的 `/nix/store` 路径已经被垃圾回收清掉了。

```bash
$ nixos-rebuild switch --rollback
error: path '/nix/store/xxxxx-...' does not exist
```

**原因**：你之前跑过 `nix-collect-garbage -d`，把旧 generation 依赖的 store 路径也清了。

**预防**：
- 垃圾回收时用 `--delete-older-than 7d` 而不是 `-d`
- 回滚之前先 `nixos-rebuild list-generations` 确认你要回滚的那个 generation 还存在
- 重要配置用 Git 管起来，就算 store 被清了至少 `configuration.nix` 还在，可以重建

---

## 总结

NixOS 是一个"要么爱要么恨"的发行版。它的声明式哲学确实优雅，但学习曲线也确实是实打实的陡峭。

踩坑的速度取决于你是不是愿意接受它的思维方式——不是在系统里"装东西"，而是在配置文件里"声明你要什么"。一旦接受了这个设定，大部分坑都是"查一下 options 然后加一行配置"的事。

> 别在凌晨三点滚 unstable。别问我是怎么知道的。

以后踩了新坑再补充。
