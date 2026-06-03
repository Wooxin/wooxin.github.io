import { defineConfig } from 'astro/config';

import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://wooxin.github.io',
  outDir: './dist',
  markdown: {
    shikiConfig: { theme: 'github-dark' },
  },
});
