// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

import tailwindcss from '@tailwindcss/vite';
import rehypeStripTtsMarkers from './src/lib/remark-strip-tts-markers.mjs';
import ttsTxtIntegration from './src/integrations/tts-script.mjs';

export default defineConfig({
  site: "https://snazzie.space",
  base: "/",
  integrations: [ttsTxtIntegration(), react(), mdx({ rehypePlugins: [rehypeStripTtsMarkers] }), sitemap()],

  markdown: {
    rehypePlugins: [rehypeStripTtsMarkers],
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ['**/public/audio/*.txt'],
      },
    },
  }
});