---
title: rightmenu
date: 2025-09-19 00:00:00
category:
  - 博客
  - 教程
tags:
  - js
  - 右键菜单
---
```js
window.WordCountUtils = {
    countWords: function () {
        // 你文章所在的ID或者类
        const articleContent = document.getElementById('post-content');
        if (!articleContent) return 0;

        const clone = articleContent.cloneNode(true);
        // 这部分是不需要统计的, 尤其是code代码块, 俩面东西过多, 如果不排除的话字数非常夸张
        const excludeSelectors = ['pre', 'code', 'script', 'style', '.highlight', '.giscus-frame'];
        excludeSelectors.forEach(selector => {
            clone.querySelectorAll(selector).forEach(el => el.remove());
        });

        const text = clone.textContent || clone.innerText;
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = (text.match(/\b[a-zA-Z]+\b/g) || []).length;

        return chineseChars + englishWords;
    },

    calculateReadingTime: function () {
        const words = this.countWords();
        return Math.ceil(words / 300);
    }
};

window.initWordCountOnly = function () {
    const words = WordCountUtils.countWords();
    const countBody = document.getElementById('post-count-body');
    if (countBody) {
        countBody.querySelector('a').textContent = words;
    }
    return words;
};

window.initReadingTimeOnly = function () {
    const readingTime = WordCountUtils.calculateReadingTime();
    const timeBody = document.getElementById('post-time-body');
    if (timeBody) {
        timeBody.querySelector('a').textContent = readingTime;
    }
    return readingTime;
};

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        initWordCountOnly();
        initReadingTimeOnly();
    }, 100);
});

if (typeof Pjax !== 'undefined') {
    document.addEventListener('pjax:success', function () {
        setTimeout(() => {
            initWordCountOnly();
            initReadingTimeOnly();
        }, 300);
    });
}
```
