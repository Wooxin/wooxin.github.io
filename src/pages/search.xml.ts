import { getCollection } from 'astro:content';
import { getPostUrl } from '../utils/posts';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await getCollection('posts', ({ data }) => data.published !== false);
  const entries = posts
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((post) => {
      const content = `${post.data.title}\n${post.data.description || ''}\n${post.body || ''}`;
      return [
        '<entry>',
        `<title>${escapeXml(post.data.title)}</title>`,
        `<url>${escapeXml(getPostUrl(post))}</url>`,
        `<content>${escapeXml(content)}</content>`,
        '</entry>',
      ].join('');
    })
    .join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><search>${entries}</search>`, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
