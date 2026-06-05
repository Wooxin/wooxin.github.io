---
title: 如何统计字数与计算阅读时间
date: 2025-09-19 00:00:00
category:
    - 教程
    - 博客
tags:
    - pug
    - js
---
## JS部分
这个代码是之前的, 我用的是ts
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

---

## Pug部分
分别在需要的地方引用: 
1. javascript:initWordCountOnly()
2. javascript:initReadingTimeOnly()
```pug
#post-count-body.p-2 
    a(href="javascript:initWordCountOnly()") 0 
    span 字
span#post-time-head.p-2 耗时:
#post-time-body.p-2 
    a(href="javascript:initReadingTimeOnly()") 0 
    span 分钟
```
