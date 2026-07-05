// Cloudflare Pages serves the *nearest* `404.html` walking up the path tree,
// so each section (`/consulting`, `/stealthvault`, ...) gets its own styled 404.
// But Astro's directory build format emits a section 404 page as
// `<section>/404/index.html`, not the `<section>/404.html` that Pages looks for.
// (The site-root `404.html` is special-cased by Astro and already correct.)
//
// This integration copies every `**/404/index.html` up to `**/404.html` after
// the build so the nested-404 lookup resolves, and removes the now-dead
// `404/` directory so it can't be hit as a real 200 route.
import { readdirSync, statSync, copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export default function nested404Integration() {
  return {
    name: 'nested-404',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);

        /** Recursively find directories literally named `404` holding an index.html. */
        function walk(current) {
          for (const entry of readdirSync(current)) {
            const path = join(current, entry);
            if (!statSync(path).isDirectory()) continue;
            if (entry === '404') {
              const src = join(path, 'index.html');
              try {
                copyFileSync(src, join(current, '404.html'));
                rmSync(path, { recursive: true, force: true });
                logger.info(`nested 404 -> ${join(current, '404.html').slice(root.length)}`);
              } catch {
                // no index.html in this 404 dir; leave it alone
              }
            } else {
              walk(path);
            }
          }
        }

        walk(root);
      },
    },
  };
}
