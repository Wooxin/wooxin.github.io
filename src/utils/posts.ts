import type { CollectionEntry } from 'astro:content';
import fs from 'fs';
import path from 'path';

type PostEntry = CollectionEntry<'posts'>;

function hashString(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** 读取文章 .md 文件的最后修改时间 */
export function getFileMtime(post: PostEntry): Date | null {
  try {
    const filePath = path.join('src/content/posts', post.id.replace(/^posts\//, ''));
    const stat = fs.statSync(filePath);
    return stat.mtime;
  } catch {
    return null;
  }
}

/** 获取文章的有效日期：有 updated 用 updated，否则用文件修改时间，再否则用 date */
export function getEffectiveDate(post: PostEntry): Date {
  if (post.data.updated) return post.data.updated;
  const mtime = getFileMtime(post);
  if (mtime && mtime > post.data.date) return mtime;
  return post.data.date;
}

export function getPostSlug(post: PostEntry) {
  const abbrlink = post.data.abbrlink;
  if (abbrlink !== undefined && abbrlink !== null && String(abbrlink).trim() !== '') {
    return String(abbrlink).trim();
  }

  const fileName = post.id.replace(/^.*[\\/]/, '').replace(/\.md$/, '');
  return hashString(fileName).slice(0, 8);
}

export function getPostUrl(post: PostEntry) {
  return `/posts/${getPostSlug(post)}/`;
}
