import type { CollectionEntry } from 'astro:content';

type PostEntry = CollectionEntry<'posts'>;

function hashString(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
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
