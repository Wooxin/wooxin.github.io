---
title: Astro 个人博客部署指南——从 Hexo 迁移到 Astro 的完整记录
date: 2026-06-05 00:00:00
category:
    - 博客
    - 教程
tags:
    - Astro
    - Hexo
    - 部署
    - GitHub Pages
    - 博客
---

> 从 Hexo 迁移到 Astro 踩了无数坑。写下来给想搞的人省点时间。

## 博客架构对比

先把市面上常见的几种方式拉出来看看。

### Hexo / Hugo / Jekyll（传统静态生成器）

| | 优点 | 缺点 |
|---|---|---|
| **Hexo** | 插件多、主题多、中文社区大、`hexo deploy` 一键部署 | Node 版本敏感、大站生成慢、每次改配置要重新生成全站 |
| **Hugo** | 快（Go 写的，秒级生成）、单二进制、模板灵活 | 模板语法怪（Go template）、生态偏英文 |
| **Jekyll** | GitHub Pages 原生支持、简单 | Ruby 依赖麻烦、慢、功能少 |

这三家的共同问题是：**生成的是完整 HTML 页面，每次切换页面都要整页刷新**。Hexo 靠 Pjax 勉强续命，但终究是打补丁。

### Next.js / Nuxt（React/Vue SSR）

| | 优点 | 缺点 |
|---|---|---|
| **Next.js** | React 生态、ISR/SSG/SSR 全支持、Vercel 部署 | 太重、对博客来说杀鸡用牛刀、首屏 JS 太大 |
| **Nuxt** | Vue 生态、同上 | 同上 |

这两家的问题是：**太重**。一个博客而已，不需要 React 运行时。而且 Markdown 渲染要走 MDX，配置繁琐。

### Astro

| 优点 | 缺点 |
|---|---|
| 默认输出零 JS、SSG/SSR 可选、岛屿架构、Markdown 原生一等公民 | 插件生态还在长、多框架混用容易版本冲突 |
| 生成的是 MPA（多页面应用），天然支持 SEO | 动态交互需要手动引入 JS |
| SPA 导航、View Transitions、Content Collections 开箱即用 | |
| 构建速度快（底层 Vite） | |

简单说：**Astro 拿了传统 SSG 的轻量 + 现代框架的 DX，输出的却是纯 HTML**。

---

## 为什么不选 Hexo 了

Hexo 跟了我两年，说实话能用。但它有几个我一直忍不了的问题：

1. **Node 版本绑死**。升了 Node 某个插件就挂，降回来另一个又不行。每次 `npm install` 都是一场赌博。

2. **生成速度**。Hexo 是串行渲染，文章多了之后 `hexo g` 要好几分钟。Astro 底层 Vite，90 多页不到 2 秒。

3. **主题开发体验**。Hexo 主题用 EJS/Pug/Stylus，切换文件热更新不稳定，经常要手动刷新。而且 Hexo 的 API 文档老得掉渣（点名说 `hexo.theme.config` 和 `hexo.config` 的混乱关系）。

4. **社区活跃度**。Hexo 的 issue 区越来越安静，插件作者很多已经不维护了。

选 Astro 的理由就一条：**Markdown 是一等公民，输出纯 HTML，构建飞快，而且能渐进加交互**。博客不需要 JavaScript 框架，但我需要方便的开发体验。

---

## 部署教程

### 1. 创建项目

```bash
npm create astro@latest
```

选 `Empty` 模板，后面自己搭。

### 2. 目录结构

```
astro-blog/
├── public/               # 静态资源（CSS、JS、图片）
│   ├── astro-modern.css  # 主题样式
│   ├── woxhome.css       # 从 Hexo 搬过来的原始样式
│   ├── scripts/          # JS（搜索、主题切换等）
│   └── robots.txt
├── src/
│   ├── content/
│   │   └── posts/        # Markdown 文章
│   ├── layouts/
│   │   └── BaseLayout.astro  # 全局布局
│   ├── pages/
│   │   ├── index.astro       # 首页
│   │   ├── posts/[slug].astro  # 文章页
│   │   ├── archives.astro    # 归档
│   │   ├── categories/       # 分类
│   │   ├── tags/             # 标签
│   │   ├── logs.astro        # 日志
│   │   └── tools.astro       # 工具页
│   └── utils/
│       └── posts.ts          # 辅助函数
├── astro.config.mjs
└── package.json
```

### 3. 配置文件

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://wooxin.github.io',
  outDir: './dist',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    },
  },
});
```

关键点：
- `trailingSlash: 'always'` — GitHub Pages 需要对目录路径正确处理
- `defaultColor: false` — Shiki 双主题需要手动写 CSS 切换颜色
- `sitemap()` — 自动生成 `sitemap-index.xml`

### 4. Content Collections

文章放 `src/content/posts/`，用 Zod schema 定义 frontmatter：

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.date(),
    updated: z.date().optional(),
    category: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    published: z.boolean().optional().default(true),
  }),
});

export const collections = { posts };
```

### 5. SPA 导航

Astro 原生支持 View Transitions，但我选择自己写 `fetch + DOM swap`：

```js
function navigate(href) {
  fetch(href)
    .then(res => res.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // 交换 mid-right 和 mid-mid 的内容
      document.getElementById('mid-right').innerHTML =
        doc.getElementById('mid-right').innerHTML;
      // 更新 title
      document.title = doc.title;
      // 推 history
      history.pushState({}, '', href);
      // 重新初始化页面组件
      initPage();
    });
}
```

这比 View Transitions 更可控——我知道哪些区域需要更新，不需要全页动画。而且没有额外依赖。

### 6. GitHub Pages 部署

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

然后去 GitHub 仓库 Settings → Pages → Source 选 "GitHub Actions"。

---

## 遇到的问题

整个迁移不算文章搬运和样式适配，纯技术问题踩了这些：

### 1. Shiki 双主题代码块无色

Astro 5 的 `defaultColor: false` 不会自动生成 `light-dark()` CSS，需要手动写：

```css
.astro-code-themes {
  color: var(--shiki-light);
}
html[data-theme='dark'] .astro-code-themes {
  color: var(--shiki-dark);
}
```

坑：Shiki 把 CSS 变量写在 `<pre style="--shiki-light:...; --shiki-dark:...">`，但 `color` 属性没有自动应用。不看源码根本不知道。

### 2. 侧边栏刷新消失

`#mid-mid` 面板在非首页刷新后变成空白。排查了三个层面才找到根因。

**表层**：`astro-modern.css` 有一条 `<code>display: none !important</code>` 规则，通过 `:not(:has(#recent-posts))` 选择器在「没有文章列表的页面」上隐藏 mid-mid。全站除了首页没有 `#recent-posts`，所以全被干了。

**深层**：去掉那条规则后还是不行。woxhome.css 的 `height: 100%` 在 flexbox 嵌套中退化为 `auto`——父级 `#layout-mid` 的高度来自 `flex: 1`（计算出来的，不是显式 height），CSS 百分比高度在这个链上完全失效。`#mid-main` → `#mid-mid` 整条链塌成 0 高度。

**最终方案**：把文章列表塞进 `BaseLayout.astro` 的 `<slot name="mid-mid">` fallback。首页用自己的 slot 内容覆盖，非首页 fallback 自动渲染。靠内容撑开面板，不跟 CSS 较劲。

### 3. `<a>` 嵌套引发的二级菜单崩溃

导航栏加了「工具」下拉，写了 `<a class="nav-dropdown"><div><a></a></div></a>`。HTML 解析器不允许 `<a>` 嵌套 `<a>`，自动关闭外层标签，`dropdown-menu` 被踢出父元素，CSS hover 全都失效。

修：外层换成 `<span>`。

### 4. `is:inline` 脚本的位置

Astro 的 `<script is:inline>` 如果写在 `</BaseLayout>` 之后，内容会被渲染到 `</html>` 之外。

修：移到 `</BaseLayout>` 前。

### 5. CSS 逗号引发的连锁污染

加 stale-badge 样式时，把规则插在了多选择器的逗号中间：

```css
#home,
article#post,
div#archive,
#categories,
/* ← 我插的新代码在这里 */
.stale-badge { width: 1.1rem; height: 1.1rem; }
```

逗号让 `article#post` 也吃了这些样式，整篇文章被压成 1.1rem 小方块。一行 CSS 就让全站文章页白屏。

### 6. MD5 纯 JS 实现的语法错误

工具页的 MD5 实现用了 64 位大数组 + 位运算，在 `<script is:inline>` 里把浏览器 JS 解析器搞炸了。换成简单的 32-bit 哈希完事。

---

## 从 Hexo 到 Astro 的感想

最直接的感受：**Hexo 像一辆开了很多年的老车，什么都能干但什么都得忍**。插件冲突、生成慢、热更新半死不活、API 文档查不到——这些问题累积两年的结果是，每次想改点东西都会先叹气。

Astro 不是完美无缺的，但它干净。输出纯 HTML 意味着做完的博客就是一个静态站，没有运行时 JS 拖累首屏。Content Collections 把 Markdown 的管理做得很舒服，`getCollection()` 加上 Frontmatter Zod 校验，再也不会出现某篇文章 typo 导致全站挂掉的情况。

迁移最大的收获不是「换了个框架」，而是**把之前靠插件堆出来的功能全都自己实现了一遍**：

- 搜索 → 自己写 fetch + 正则
- SPA 导航 → 自己写 DOM swap
- 主题切换 → 自己写 CSS 变量 + localStorage
- 文章列表 → 自己写 Content Collection 查询

每个功能都清楚它怎么工作的，出问题知道去哪修。这比 Hexo 时期「装个插件、不知道它干了什么、出问题只能搜 issue」强太多了。

如果你在考虑从 Hexo 迁出来，我的建议是：**先别急着改样式，先把内容搬过来**。样式可以复用原来的 CSS（我就是直接把 woxhome.css 搬过来的），文章从 `source/_posts/` 拷到 `src/content/posts/`，改一下 frontmatter 格式（`tags` 改成 YAML 数组、`date` 改成 `YYYY-MM-DD`）。17 篇文章搬运 + 调试花了两天，后面两周全在折腾布局和交互细节。

博客这件事，内容比框架重要。但如果框架让你写内容的阻力变大了，那就换。
