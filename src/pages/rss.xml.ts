import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getPostUrl } from '../utils/posts';

export async function GET() {
  const posts = await getCollection('posts', ({ data }) => data.published !== false);
  posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: '书集',
    description: 'Wooxin 的技术博客 - Linux运维、网络排错、开发工具配置',
    site: 'https://wooxin.github.io',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description || '',
      link: getPostUrl(post),
      pubDate: post.data.date,
    })),
  });
}
