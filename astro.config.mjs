import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import cloudflare from "@astrojs/cloudflare";

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
      langs: [],
      langAlias: {
        npm: 'bash',
      },
    },
  },

  adapter: cloudflare()
});