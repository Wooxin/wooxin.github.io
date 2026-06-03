---
title: 在electron中使用pug和stylus
date: 2025-09-17
category:
    - 教程
    - electron
tags:
    - electron
    - pug
    - stylus
    - 预编译器
---
## 在electron中使用pug
下载[electron-pug](https://www.npmjs.com/package/electron-pug)
```shell
npm install electron-pug
```

在你的main.js中引用electron-pug
```js
const setupPug = require('electron-pug');
```

在createWindow的BrowserWindow之前添加如下代码
```js
let pug;
try {
    pug = await setupPug({
        pretty: true
    });
    pug.on('error', err => console.error('electron-pug 错误', err));
} catch (err) {
    console.error("无法启动 'electron-pug'", err);
    return;
}
```

---
## 在electron中使用stylus
下载stylus
```shell
npm install stylus stylus-loader
```

然后直接用就可以了, stylus会在运行时自动编译为css
