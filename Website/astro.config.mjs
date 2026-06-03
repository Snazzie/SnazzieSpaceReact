// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

import tailwindcss from '@tailwindcss/vite';
import remarkStripTtsMarkers from './src/lib/remark-strip-tts-markers.mjs';

export default defineConfig({
  site: "https://snazzie.space",
  base: "/",
  integrations: [react(), mdx(), sitemap()],

  markdown: {
    remarkPlugins: [remarkStripTtsMarkers],
  },

  vite: {
    plugins: [tailwindcss()]
  }
});