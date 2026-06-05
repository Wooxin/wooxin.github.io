---
title: 文章阅读进度百分比的实现
date: 2025-09-17 00:00:00
category:
    - 教程
    - 博客
tags:
    - pug
    - js
---
## pug相关
```pug
//- 选择一个你需要的ID或者类
.reading-progress 0%
```

## js相关
```js
const ReadingProgress = (function () {
    let scrollContainer = null;
    let progressText = null;

    function updateReadingProgress() {
        const scrollTop = scrollContainer.scrollTop;
        const scrollHeight = scrollContainer.scrollHeight;
        const clientHeight = scrollContainer.clientHeight;
        const maxScrollTop = scrollHeight - clientHeight;
        
        const progress = maxScrollTop > 0 ? Math.min((scrollTop / maxScrollTop) * 100, 100) : 0;

        progressText.textContent = Math.round(progress) + '%';
    }

    // init
    function init() {
        // 你的文章所在的ID或者类
        scrollContainer = document.querySelector('#post-content');
        // 你的0%所在的类或者ID
        progressText = document.querySelector('.reading-progress');

        if (!scrollContainer || !progressText) return;

        scrollContainer.addEventListener('scroll', updateReadingProgress);
        window.addEventListener('resize', updateReadingProgress);

        updateReadingProgress();
    }
    return {
        init
    };
})();

document.addEventListener('DOMContentLoaded', ReadingProgress.init);
document.addEventListener('pjax:complete', ReadingProgress.init);
```
