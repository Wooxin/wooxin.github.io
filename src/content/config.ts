import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    description: z.string().optional(),
    published: z.boolean().default(true),
  }),
});

export const collections = { posts };
