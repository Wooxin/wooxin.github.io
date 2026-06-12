// 新建文章脚本
// 用法: npm run new -- "文章标题"
//      node scripts/new-post.mjs "文章标题"
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '../src/content/posts');

const title = process.argv[2];
if (!title) {
  console.log('用法: npm run new -- "文章标题"');
  process.exit(1);
}

// 清理文件名中的非法字符
const safeName = title.replace(/[<>:"/\\|?*]/g, '-').trim();
const filename = `${safeName}.md`;
const filePath = path.join(POSTS_DIR, filename);

if (fs.existsSync(filePath)) {
  console.error(`文件已存在: ${filename}`);
  process.exit(1);
}

// 生成日期: YYYY-MM-DD HH:mm:ss
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

const frontmatter = `---
title: ${title}
date: ${dateStr}
category:
  -
tags:
  -
description:
---

`;

fs.mkdirSync(POSTS_DIR, { recursive: true });
fs.writeFileSync(filePath, frontmatter, 'utf8');
console.log(`✅ 已创建: src/content/posts/${filename}`);
