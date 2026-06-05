---
title: 将Centos的GLIB2升级到GLIB3
date: 2023-11-05 09:35:06
category:
    - Centos
    - GLIB
tags:
    - Centos
    - 教程
    - 升级
    - GLIB
---
## 更换软件源
``` shell
# 备份软件源
cp -fr /etc/yum.repos.d/ /etc/yum.repos.d.bak
curl -o /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-7.repo
# 下载备用依赖
yum -y install wget epel-release screen glibc.i686 python3 libselinux libselinux-devel
yum -y groupinstall 'Development Tools'
```

### 添加scl源
``` shell
yum install -y centos-release-scl centos-release-scl-rh
# vi /etc/yum.repos.d/CentOS-SCLo-scl.repo
[centos-sclo-sclo]
name=CentOS-7 - SCLo sclo
baseurl=https://mirrors.aliyun.com/centos/7/sclo/x86_64/sclo/
gpgcheck=0
enabled=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-SIG-SCLo

# vi /etc/yum.repos.d/CentOS-SCLo-scl-rh.repo
[centos-sclo-rh]
name=CentOS-7 - SCLo rh
baseurl=https://mirrors.aliyun.com/centos/7/sclo/x86_64/rh/
gpgcheck=0
enabled=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-SIG-SCLo
```

## 源码包编译
### 升级make4.3
``` shell
wget -O - https://ftp.gnu.org/gnu/make/make-4.3.tar.gz | tar -xz
# 或
wget -O - https://mirrors.aliyun.com/gnu/make/make-4.3.tar.gz | tar -xz
```

### 编译安装make4.3
``` shell
cd make-4.3/ && mkdir build && cd build
../configure && make -j24 && make install
# 寻找有哪些make

[root@scpsl build]# whereis make
make: /usr/bin/make /usr/local/bin/make /usr/share/man/man1/make.1.gz

# 替换make
cd /usr/bin/
mv make make.bak
ln -sv /usr/local/bin/make /usr/bin/make

# 查看make是否为4.3版本
make -v 
```

## 升级gcc11
``` shell
# 列出所有可安装的gcc版本
yum list devtoolset-*-gcc

# 安装gcc11
yum -y install devtoolset-11-gcc devtoolset-11-gcc-c++ devtoolset-11-binutils

# 设定并启动gcc11
scl enable devtoolset-11 bash && echo "# gcc11" >> /etc/profile && echo "source /opt/rh/devtoolset-11/enable" >> /etc/profile

# 查看gcc是否为11版本
gcc -v
```

## 升级GLIBC_3.33
``` shell
# 下载并解压glibc
wget -O - https://ftp.gnu.org/gnu/libc/glibc-2.33.tar.xz | tar -xJ
mkdir glibc-2.33/build && cd glibc-2.33/build/

# 清空环境变量
LD_LIBRARY_PATH=''
../configure --prefix=/usr --mandir=/usr/share/man --infodir=/usr/share/info --build=x86_64-redhat-linux --enable-kernel=3.10.0 --without-gd --disable-profile --with-selinux
make -j # 构建时间较长
sed -i '128i\ && $name ne "nss_test2"' ../scripts/test-installation.pl
make install
make -j28 localedata/install-locales
service crond restart
```
