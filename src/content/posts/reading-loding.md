---
title: 文章阅读进度条的实现
date: 2025-09-17
category:
    - 教程
    - 博客
tags:
    - pug
    - js
---
## pug相关
```pug
//- 找到一个你想用的id或者类
#layout-top
```

## js相关
```js
function initLayoutTopSync() {
    const lt = document.querySelector('#layout-top'),
        pt = document.querySelector('.reading-progress-text');
    if (!lt || !pt) return;

    const fill = document.createElement('div');
    // 这里是定义颜色样式什么的
    fill.style.cssText = 'position:absolute;top:0;left:0;height:5px;background:rgba(59,124,255,0.4);width:0%;';
    lt.appendChild(fill);

    new MutationObserver(() => fill.style.width = (parseFloat(pt.textContent) || 0) + '%')
        .observe(pt, {
            characterData: true,
            childList: true,
            subtree: true
        });

    fill.style.width = (parseFloat(pt.textContent) || 0) + '%';
}

document.addEventListener('DOMContentLoaded', initLayoutTopSync);
document.addEventListener('pjax:complete', initLayoutTopSync);
```
