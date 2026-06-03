---
title: NVM完美配置教程
date: 2024-11-04
category: 
    - Node
    - NVM
tags: 
    - 教程
    - NodeJS
    - Node
    - nvm
    - 环境变量
---
> 本文使用的NVM为Windows版本的**nvm-noinstall.zip**

## 下载NVM
去Github或者镜像站查找并下载[NVM for windows](https://github.com/coreybutler/nvm-windows/releases)

## 安装NVM
打开**nvm-noinstall.zip**并解压至自己的目录
运行install.cmd(不运行也可以, 我就没有运行, 因为我要自己配置环境变量)

### 写配置文件
打开或创建settings.txt
``` txt
root: D:\path\dir\NVM
path: D:\path\dir\NVM\NodeJS
arch: 64
proxy: none
```
这里要对对照自己的NVM安装路径进行放置, 并且创建相应的文件

### 配环境变量
此电脑 > 属性 > 高级系统设置 > 环境变量
在系统变量内部``新建``两个变量

|变量名|变量值|
|:-:|:-:|
|NVM_HOME|D:\path\dir\NVM|
|NVM_SYMLINK|D:\path\dir\NVM\NodeJS|

然后在 系统变量 内部的 path 添加
``` npm
D:\path\dir\NVM
%NVM_HOME%
%NVM_SYMLINK%
```

### 验证安装是否成功
打开cmd或者powershell
``` cmd
nvm -v
1.1.12
```

---

## 配置Nodejs
在你的``C:\Users\username``下创建一个.npmrc
``` npm
prefix=D:\path\dir\NVM\node_global
cache=D:\path\dir\NVM\node_cache
```
跟上面一样, 这里也要创建文件, 确保配置文件内的路径与你的目录是一致的

### 配置环境变量
在系统变量内部``新建``两个变量

|变量名|变量值|
|:-:|:-:|
|NODE_PATH|D:\path\dir\NVM\node_global\node_modules|

然后在 系统变量 内部的 path 添加
``` npm
%NODE_PATH%
D:\path\dir\NVM\node_global
```

---

## 安装Node
打开CMD或者Powershell
``` cmd
# 列出所有的可下载版本
nvm list available

# 使用NVM下载安装20.18.0版本
nvm install 20.18.0

# 使用20.18.0版本
use 20.18.0
```

### 配置全局与缓存
其实这一步就是上面的.npmrc, 这里为了避免万一就重复一次, 只是方式不一样
``` npm
npm config set prefix "D:\path\dir\NVM\node_global"
npm config set cache "D:\path\dir\NVM\node_cache"
```

### 检查Node是否安装成功
打开cmd或者powershell
```cmd
node -v
npm -v
```
