// @ts-check
import { defineConfig } from 'astro/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';

import tailwindcss from '@tailwindcss/vite';
import rehypeStripTtsMarkers from './src/lib/remark-strip-tts-markers.mjs';
import ttsTxtIntegration from './src/integrations/tts-script.mjs';
import consentHeadIntegration from './src/integrations/consent-head.mjs';

/** Dev-only endpoint: persist retimed radio clips back to the episode JSON.
 *  Active only under `astro dev`; never included in the production build. */
function radioSaveDevPlugin() {
  const dataDir = fileURLToPath(new URL('./src/data/radio/', import.meta.url));
  /** @type {import('vite').Plugin} */
  const plugin = {
    name: 'radio-save-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/radio-save', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          try {
            const { slug, lines } = JSON.parse(body);
            if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('bad slug');
            const file = dataDir + slug + '.json';
            const episode = JSON.parse(readFileSync(file, 'utf-8'));
            episode.lines = lines;
            writeFileSync(file, JSON.stringify(episode, null, 2) + '\n');
            res.statusCode = 200; res.end('ok');
          } catch (err) {
            res.statusCode = 400; res.end(String(err));
          }
        });
      });
    },
  };
  return plugin;
}

export default defineConfig({
  site: "https://snazzie.space",
  base: "/",
  integrations: [consentHeadIntegration(), ttsTxtIntegration(), react(), mdx(), sitemap()],

  markdown: {
    processor: unified({ rehypePlugins: [rehypeStripTtsMarkers] }),
  },

  vite: {
    plugins: [tailwindcss(), radioSaveDevPlugin()],
    optimizeDeps: {
      include: ['d3-geo'],
    },
    server: {
      watch: {
        ignored: ['**/public/audio/*.txt'],
      },
    },
  }
});